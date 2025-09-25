import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

interface AuditInfo {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const auditLog = (auditInfo: AuditInfo) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const originalSend = res.send;
      
      // Override res.send to capture response
      res.send = function(body: any) {
        // Only log if the operation was successful (2xx status)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const logEntry = new AuditLog({
            userId: req.user?._id,
            action: auditInfo.action,
            resource: auditInfo.resource,
            resourceId: auditInfo.resourceId || req.params.id,
            details: {
              ...auditInfo.details,
              method: req.method,
              path: req.path,
              query: req.query,
              body: req.method !== 'GET' ? req.body : undefined,
              statusCode: res.statusCode
            },
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            severity: auditInfo.severity || 'low'
          });
          
          logEntry.save().catch(error => {
            logger.error('Failed to save audit log:', error);
          });
        }
        
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error('Audit logging middleware error:', error);
      next();
    }
  };
};

export const auditLoginAttempt = async (
  req: Request,
  success: boolean,
  userId?: string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    const logEntry = new AuditLog({
      userId: userId || null,
      action: success ? 'login_success' : 'login_failed',
      resource: 'auth',
      details: {
        method: req.method,
        path: req.path,
        email: req.body.email,
        pin: req.body.pin ? '****' : undefined,
        ...details
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: success ? 'low' : 'medium'
    });
    
    await logEntry.save();
  } catch (error) {
    logger.error('Failed to log login attempt:', error);
  }
};

export const auditSecurityViolation = async (
  req: AuthRequest,
  violation: string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    const logEntry = new AuditLog({
      userId: req.user?._id || null,
      action: 'security_violation',
      resource: 'system',
      details: {
        violation,
        method: req.method,
        path: req.path,
        query: req.query,
        ...details
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: 'high'
    });
    
    await logEntry.save();
  } catch (error) {
    logger.error('Failed to log security violation:', error);
  }
};

export const auditUnauthorizedAccess = async (
  req: AuthRequest,
  requiredRole: string[],
  userRole?: string
): Promise<void> => {
  try {
    const logEntry = new AuditLog({
      userId: req.user?._id || null,
      action: 'unauthorized_access_attempt',
      resource: 'system',
      details: {
        requiredRoles: requiredRole,
        userRole: userRole,
        method: req.method,
        path: req.path,
        query: req.query
      },
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      severity: 'high'
    });
    
    await logEntry.save();
  } catch (error) {
    logger.error('Failed to log unauthorized access attempt:', error);
  }
};