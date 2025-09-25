import { Request, Response, NextFunction } from 'express';
import Tenant, { ITenant } from '../models/Tenant';
import logger from '../utils/logger';

// Extend Request interface to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: ITenant;
      tenantId?: string;
    }
  }
}

export interface TenantRequest extends Request {
  tenant: ITenant;
  tenantId: string;
}

/**
 * Middleware to resolve tenant from request
 * Supports multiple resolution methods:
 * 1. Subdomain (preferred): tenant.app.com
 * 2. Custom domain: custom.domain.com
 * 3. Header: X-Tenant-ID
 * 4. Query parameter: ?tenant=tenant_id
 */
export const resolveTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let tenant: ITenant | null = null;
    let tenantIdentifier: string = '';
    let resolutionMethod: string = '';
    
    // Method 1: Subdomain resolution (primary method)
    const hostname = req.get('host') || '';
    const hostParts = hostname.split('.');
    
    if (hostParts.length >= 2) {
      const subdomain = hostParts[0];
      
      // Skip common subdomains
      if (subdomain && !['www', 'api', 'admin', 'app'].includes(subdomain.toLowerCase())) {
        tenant = await Tenant.findOne({
          subdomain: subdomain.toLowerCase(),
          isActive: true,
          isSuspended: false,
          'subscription.status': { $in: ['trial', 'active'] }
        });
        
        if (tenant) {
          tenantIdentifier = subdomain;
          resolutionMethod = 'subdomain';
        }
      }
    }
    
    // Method 2: Custom domain resolution
    if (!tenant && hostname) {
      tenant = await Tenant.findOne({
        customDomain: hostname.toLowerCase(),
        isActive: true,
        isSuspended: false,
        'subscription.status': { $in: ['trial', 'active'] }
      });
      
      if (tenant) {
        tenantIdentifier = hostname;
        resolutionMethod = 'custom_domain';
      }
    }
    
    // Method 3: Header-based resolution (for API clients)
    if (!tenant && req.headers['x-tenant-id']) {
      const headerTenantId = req.headers['x-tenant-id'] as string;
      
      // Check if it's an ObjectId or subdomain
      if (headerTenantId.match(/^[0-9a-fA-F]{24}$/)) {
        // It's an ObjectId
        tenant = await Tenant.findOne({
          _id: headerTenantId,
          isActive: true,
          isSuspended: false,
          'subscription.status': { $in: ['trial', 'active'] }
        });
      } else {
        // It's a subdomain
        tenant = await Tenant.findOne({
          subdomain: headerTenantId.toLowerCase(),
          isActive: true,
          isSuspended: false,
          'subscription.status': { $in: ['trial', 'active'] }
        });
      }
      
      if (tenant) {
        tenantIdentifier = headerTenantId;
        resolutionMethod = 'header';
      }
    }
    
    // Method 4: Query parameter (fallback for development)
    if (!tenant && req.query.tenant) {
      const queryTenant = req.query.tenant as string;
      
      if (queryTenant.match(/^[0-9a-fA-F]{24}$/)) {
        tenant = await Tenant.findById(queryTenant);
      } else {
        tenant = await Tenant.findOne({
          subdomain: queryTenant.toLowerCase(),
          isActive: true,
          isSuspended: false
        });
      }
      
      if (tenant) {
        tenantIdentifier = queryTenant;
        resolutionMethod = 'query';
      }
    }
    
    // If still no tenant found, return error
    if (!tenant) {
      logger.warn('Tenant resolution failed', {
        hostname,
        headers: {
          'x-tenant-id': req.headers['x-tenant-id'],
          'user-agent': req.headers['user-agent']
        },
        query: req.query.tenant,
        ip: req.ip
      });
      
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'The requested organization could not be found or is inactive.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    // Additional validation checks
    
    // Check if tenant is suspended
    if (tenant.isSuspended) {
      logger.warn('Access attempt to suspended tenant', {
        tenantId: tenant._id,
        tenantName: tenant.name,
        suspensionReason: tenant.suspensionReason,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Account suspended',
        message: tenant.suspensionReason || 'This account has been suspended.',
        code: 'TENANT_SUSPENDED'
      });
    }
    
    // Check subscription status
    if (!['trial', 'active'].includes(tenant.subscription.status)) {
      logger.warn('Access attempt to inactive subscription', {
        tenantId: tenant._id,
        subscriptionStatus: tenant.subscription.status,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Subscription inactive',
        message: 'This account subscription is not active.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }
    
    // Check trial expiration
    if (tenant.subscription.status === 'trial' && 
        tenant.subscription.trialEndsAt && 
        tenant.subscription.trialEndsAt < new Date()) {
      
      logger.warn('Access attempt to expired trial', {
        tenantId: tenant._id,
        trialEndDate: tenant.subscription.trialEndsAt,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Trial expired',
        message: 'The free trial period has ended. Please upgrade to continue.',
        code: 'TRIAL_EXPIRED'
      });
    }
    
    // All checks passed, attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant._id.toString();
    
    // Add tenant context to response headers (useful for debugging)
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Tenant-ID', tenant._id.toString());
      res.setHeader('X-Tenant-Subdomain', tenant.subdomain);
      res.setHeader('X-Tenant-Resolution-Method', resolutionMethod);
    }
    
    // Log successful tenant resolution
    logger.debug('Tenant resolved successfully', {
      tenantId: tenant._id,
      tenantName: tenant.name,
      subdomain: tenant.subdomain,
      resolutionMethod,
      tenantIdentifier,
      businessType: tenant.businessType,
      subscriptionPlan: tenant.subscription.plan,
      ip: req.ip
    });
    
    next();
    
  } catch (error) {
    logger.error('Tenant resolution error:', error);
    
    return res.status(500).json({
      error: 'Tenant resolution failed',
      message: 'An error occurred while identifying the organization.',
      code: 'TENANT_RESOLUTION_ERROR'
    });
  }
};

/**
 * Middleware to validate tenant features
 * Checks if the tenant's subscription includes the required feature
 */
export const requireFeature = (featureName: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return res.status(500).json({
        error: 'Tenant context missing',
        code: 'MISSING_TENANT_CONTEXT'
      });
    }
    
    if (!req.tenant.hasFeature(featureName)) {
      logger.warn('Feature access denied', {
        tenantId: req.tenant._id,
        featureName,
        subscriptionPlan: req.tenant.subscription.plan,
        availableFeatures: req.tenant.subscription.features
      });
      
      return res.status(403).json({
        error: 'Feature not available',
        message: `This feature requires a higher subscription plan.`,
        feature: featureName,
        currentPlan: req.tenant.subscription.plan,
        code: 'FEATURE_NOT_AVAILABLE'
      });
    }
    
    next();
  };
};

/**
 * Middleware to check subscription limits
 */
export const checkSubscriptionLimits = (limitType: 'users' | 'projects' | 'locations') => {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenant) {
        return res.status(500).json({
          error: 'Tenant context missing',
          code: 'MISSING_TENANT_CONTEXT'
        });
      }
      
      let currentCount = 0;
      let maxAllowed = 0;
      
      switch (limitType) {
        case 'users':
          // Count active users in tenant
          const User = require('../models/User').default;
          currentCount = await User.countDocuments({
            tenantId: req.tenant._id,
            isActive: true
          });
          maxAllowed = req.tenant.subscription.maxUsers;
          break;
          
        case 'projects':
          const Project = require('../models/Project').default;
          currentCount = await Project.countDocuments({
            tenantId: req.tenant._id,
            isActive: true
          });
          maxAllowed = req.tenant.subscription.maxProjects || Infinity;
          break;
          
        case 'locations':
          currentCount = req.tenant.settings.location.allowedLocations?.length || 0;
          maxAllowed = req.tenant.subscription.maxLocations || Infinity;
          break;
      }
      
      if (currentCount >= maxAllowed && maxAllowed !== Infinity) {
        logger.warn('Subscription limit exceeded', {
          tenantId: req.tenant._id,
          limitType,
          currentCount,
          maxAllowed,
          subscriptionPlan: req.tenant.subscription.plan
        });
        
        return res.status(403).json({
          error: 'Subscription limit exceeded',
          message: `You have reached the maximum number of ${limitType} allowed by your subscription plan.`,
          limitType,
          currentCount,
          maxAllowed,
          subscriptionPlan: req.tenant.subscription.plan,
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED'
        });
      }
      
      next();
      
    } catch (error) {
      logger.error('Subscription limit check error:', error);
      return res.status(500).json({
        error: 'Subscription validation failed',
        code: 'SUBSCRIPTION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Utility function to get tenant from request (with type safety)
 */
export const getTenant = (req: Request): ITenant | null => {
  return req.tenant || null;
};

/**
 * Utility function to get tenant ID from request
 */
export const getTenantId = (req: Request): string | null => {
  return req.tenantId || null;
};

export default {
  resolveTenant,
  requireFeature,
  checkSubscriptionLimits,
  getTenant,
  getTenantId
};