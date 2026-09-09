import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';

export function auditLog(action: string, resourceType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Run original handler and log on successful mutation
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          await supabaseAdmin.from('audit_logs').insert({
            user_id: req.user.id,
            role: req.user.role,
            action,
            resource_type: resourceType,
            resource_id: req.params.id || (req as any).auditResourceId || null,
            ip_address: req.ip || req.socket.remoteAddress,
            metadata: {
              path: req.originalUrl,
              method: req.method,
              query: req.query,
            },
          });
        } catch (auditErr) {
          console.error('Audit logging failed silently:', auditErr);
        }
      }
    });

    next();
  };
}
