import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

interface LocationInfo {
  ip?: string;
  ssid?: string;
  latitude?: number;
  longitude?: number;
}

// CIDR to range conversion helper
const cidrToRange = (cidr: string): { start: number, end: number } => {
  const [ip, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix);
  const ipParts = ip.split('.').map(Number);
  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  
  const mask = 0xFFFFFFFF << (32 - prefixLength);
  const start = ipNum & mask;
  const end = start + (0xFFFFFFFF >>> prefixLength);
  
  return { start, end };
};

// IP address to number conversion
const ipToNumber = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// Check if IP is in allowed ranges
const isIpAllowed = (clientIp: string, allowedIps: string[]): boolean => {
  const clientIpNum = ipToNumber(clientIp);
  
  return allowedIps.some(allowedIp => {
    if (allowedIp.includes('/')) {
      // CIDR notation
      const { start, end } = cidrToRange(allowedIp);
      return clientIpNum >= start && clientIpNum <= end;
    } else {
      // Single IP
      return clientIp === allowedIp;
    }
  });
};

// Get client IP from request
const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp;
  }
  
  return req.socket.remoteAddress || req.connection.remoteAddress || req.ip || '';
};

export const checkLocationRestriction = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Skip restriction for admin users
    if (req.user?.role === 'admin') {
      return next();
    }
    
    const allowedSSIDs = process.env.ALLOWED_SSIDS?.split(',').map(s => s.trim()) || [];
    const allowedIPs = process.env.ALLOWED_IPS?.split(',').map(s => s.trim()) || [];
    
    // If no restrictions are configured, allow all
    if (allowedSSIDs.length === 0 && allowedIPs.length === 0) {
      logger.warn('No location restrictions configured - allowing all requests');
      return next();
    }
    
    const clientIp = getClientIp(req);
    const locationInfo: LocationInfo = req.body.location || {};
    
    // Check IP restriction
    if (allowedIPs.length > 0) {
      if (!clientIp || !isIpAllowed(clientIp, allowedIPs)) {
        logger.warn(`Access denied from IP: ${clientIp}`, {
          userId: req.user?._id,
          userAgent: req.headers['user-agent'],
          allowedIPs
        });
        
        res.status(403).json({ 
          error: 'Access denied: Not from authorized location',
          code: 'LOCATION_RESTRICTED'
        });
        return;
      }
    }
    
    // Check SSID restriction (if provided)
    if (allowedSSIDs.length > 0 && locationInfo.ssid) {
      if (!allowedSSIDs.includes(locationInfo.ssid)) {
        logger.warn(`Access denied from SSID: ${locationInfo.ssid}`, {
          userId: req.user?._id,
          clientIp,
          allowedSSIDs
        });
        
        res.status(403).json({ 
          error: 'Access denied: Not connected to authorized Wi-Fi network',
          code: 'WIFI_RESTRICTED'
        });
        return;
      }
    }
    
    // Log successful location check
    logger.info('Location check passed', {
      userId: req.user?._id,
      clientIp,
      ssid: locationInfo.ssid
    });
    
    next();
  } catch (error) {
    logger.error('Location restriction error:', error);
    res.status(500).json({ error: 'Location verification failed' });
  }
};

// Middleware specifically for clock-in/out operations
export const requireLocationForClocking = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // For clock operations, we want stricter location requirements
  const locationInfo: LocationInfo = req.body.location || {};
  
  if (!locationInfo.ip && !locationInfo.ssid) {
    res.status(400).json({
      error: 'Location information required for clocking operations',
      code: 'LOCATION_REQUIRED',
      required: ['ip', 'ssid']
    });
    return;
  }
  
  checkLocationRestriction(req, res, next);
};

// Optional middleware for less critical operations
export const optionalLocationCheck = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Only apply restrictions if location info is provided
  const locationInfo: LocationInfo = req.body.location || {};
  
  if (locationInfo.ip || locationInfo.ssid) {
    checkLocationRestriction(req, res, next);
  } else {
    next();
  }
};