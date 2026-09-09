import { Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseAnon } from '../config/supabase';
import { AuthRequest, UserRole } from '../types';

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing Bearer token' },
      });
      return;
    }

    // Verify token with Supabase Auth
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !authData.user) {
      // In development mode with placeholder credentials, fallback to test header if present
      if (process.env.NODE_ENV === 'development' && req.headers['x-dev-user-id']) {
        req.user = {
          id: req.headers['x-dev-user-id'] as string,
          email: (req.headers['x-dev-user-email'] as string) || 'farmer@agritrace.dev',
          role: (req.headers['x-dev-user-role'] as UserRole) || 'FARMER',
          fullName: (req.headers['x-dev-user-name'] as string) || 'Demo Farmer',
          languagePreference: 'en',
        };
        req.token = token;
        return next();
      }

      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: authError?.message || 'Invalid or expired token' },
      });
      return;
    }

    // Fetch user profile & role from public.users table
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!profile) {
      // Auto-create/upsert user record in public.users to satisfy foreign key constraints
      const userRole = (authData.user.user_metadata?.role as UserRole) || 'FARMER';
      const fullName =
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.fullName ||
        authData.user.email?.split('@')[0] ||
        'Farmer';

      const { data: createdProfile } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: authData.user.id,
            email: authData.user.email || '',
            role: userRole,
            full_name: fullName,
            phone: authData.user.phone || authData.user.user_metadata?.phone,
            language_preference: authData.user.user_metadata?.language_preference || 'en',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      profile = createdProfile || {
        id: authData.user.id,
        email: authData.user.email || '',
        role: userRole,
        full_name: fullName,
        phone: authData.user.phone,
        language_preference: 'en',
      };
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
      phone: profile.phone,
      languagePreference: profile.language_preference || 'en',
    };

    req.token = token;
    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: err.message || 'Authentication processing error' },
    });
  }
}

// Optional Auth (For public trace pages where authenticated user info enhances context)
export async function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authMiddleware(req, res, next);
}
