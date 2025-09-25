import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
// import { TenantRequest } from './tenantResolver'; // Not needed since we define AuthTenantRequest directly
import { ITenant } from '../models/Tenant';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
  userRole?: string;
}

// Interface for requests that require both authentication and tenant context
export interface AuthTenantRequest extends Request {
  user?: IUser;
  userId?: string;
  userRole?: string;
  tenant: ITenant;
  tenantId: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
      return;
    }
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { id: string; tenantId?: string };
    
    // Build user query with tenant context if available
    const userQuery: any = { _id: decoded.id };
    if (decoded.tenantId) {
      userQuery.tenantId = decoded.tenantId;
    }
    
    const user = await User.findOne(userQuery)
      .select('-pin -twoFactorAuth.secret')
      .populate('manager', 'name email')
      .populate('contractorInfo.clients', 'name email clientContactInfo.companyName');
    
    if (!user || !user.isActive) {
      logger.warn('Authentication failed - user not found or inactive', {
        userId: decoded.id,
        tenantId: decoded.tenantId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      res.status(401).json({ 
        error: 'Invalid authentication',
        code: 'INVALID_USER'
      });
      return;
    }
    
    // Check if user account is locked
    if (user.isLocked && user.isLocked()) {
      res.status(423).json({ 
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockoutUntil: user.lockoutUntil
      });
      return;
    }
    
    // For multi-tenant requests, ensure user belongs to the resolved tenant
    const tenantReq = req as AuthTenantRequest;
    if (tenantReq.tenant && user.tenantId.toString() !== (tenantReq.tenant._id as mongoose.Types.ObjectId).toString()) {
      logger.warn('Tenant mismatch in authentication', {
        userId: user._id,
        userTenantId: user.tenantId,
        requestTenantId: (tenantReq.tenant._id as mongoose.Types.ObjectId),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      res.status(403).json({ 
        error: 'Access denied - tenant mismatch',
        code: 'TENANT_MISMATCH'
      });
      return;
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Attach user info to request
    req.user = user;
    req.userId = (user._id as mongoose.Types.ObjectId).toString();
    req.userRole = user.role;
    
    logger.debug('User authenticated successfully', {
      userId: (user._id as mongoose.Types.ObjectId),
      tenantId: user.tenantId,
      role: user.role,
      route: req.path
    });
    
    next();
  } catch (error: unknown) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      res.status(500).json({ 
        error: 'Authentication system error',
        code: 'AUTH_SYSTEM_ERROR'
      });
    }
  }
};

// Enhanced protect function that requires tenant context
export const protectWithTenant = async (
  req: AuthTenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // First ensure tenant is resolved
  if (!req.tenant || !req.tenantId) {
    res.status(400).json({ 
      error: 'Tenant context required',
      code: 'NO_TENANT_CONTEXT'
    });
    return;
  }
  
  // Then authenticate user within tenant context
  await protect(req, res, next);
};

// Alias for backward compatibility
export const authenticate = protect;

export const authorize = (roles: string[], permissions?: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
      return;
    }
    
    const hasRole = roles.includes(req.user.role);
    const hasPermission = permissions ? 
      permissions.some(p => req.user!.hasPermission(p)) : true;
    
    if (!hasRole || !hasPermission) {
      logger.warn('Authorization failed', {
        userId: (req.user._id as mongoose.Types.ObjectId),
        userRole: req.user.role,
        userPermissions: req.user.permissions,
        requiredRoles: roles,
        requiredPermissions: permissions,
        route: req.path,
        method: req.method
      });
      
      res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'ACCESS_DENIED',
        required: {
          roles: roles,
          permissions: permissions
        },
        current: {
          role: req.user.role,
          permissions: req.user.permissions
        }
      });
      return;
    }
    
    next();
  };
};

// Enhanced authorization for contractor management
export const authorizeContractorAccess = (allowSelfAccess = false) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
      return;
    }
    
    const { contractorId } = req.params;
    const user = req.user;
    
    // Admin and managers have full access
    if (['admin', 'manager'].includes(user.role)) {
      return next();
    }
    
    // Client contacts can access contractors they manage
    if (user.role === 'client_contact' && user.clientContactInfo?.contractorsManaged) {
      const canAccess = user.clientContactInfo.contractorsManaged
        .some(id => id.toString() === contractorId);
      
      if (canAccess) {
        return next();
      }
    }
    
    // Contractors can access their own data if allowed
    if (allowSelfAccess && user.role === 'contractor' && (user._id as mongoose.Types.ObjectId).toString() === contractorId) {
      return next();
    }
    
    logger.warn('Contractor access denied', {
      userId: (user._id as mongoose.Types.ObjectId),
      userRole: user.role,
      contractorId,
      allowSelfAccess,
      route: req.path
    });
    
    res.status(403).json({ 
      error: 'Access denied - cannot access contractor data',
      code: 'CONTRACTOR_ACCESS_DENIED'
    });
  };
};

// Check if user can approve time entries
export const authorizeTimeEntryApproval = () => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
      return;
    }
    
    const user = req.user;
    
    // Admin and managers can approve
    if (['admin', 'manager'].includes(user.role)) {
      return next();
    }
    
    // Client contacts with approval authority can approve
    if (user.role === 'client_contact' && user.clientContactInfo?.approvalAuthority) {
      return next();
    }
    
    res.status(403).json({ 
      error: 'Insufficient permissions for time entry approval',
      code: 'APPROVAL_ACCESS_DENIED'
    });
  };
};