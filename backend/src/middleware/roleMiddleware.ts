import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (req.user.role === 'ADMIN') {
      return next(); // Admin has universal access
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of [${allowedRoles.join(', ')}], current role is [${req.user.role}]`,
        },
      });
      return;
    }

    next();
  };
}
