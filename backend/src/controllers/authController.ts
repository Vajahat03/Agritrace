import { Response } from 'express';
import { AuthRequest } from '../types';
import { UserRepository } from '../repositories/userRepository';

export class AuthController {
  // Sync profile after Supabase signup/login
  static async syncProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { fullName, phone, role, languagePreference, address } = req.body;

      const profile = await UserRepository.upsert({
        id: user.id,
        email: user.email,
        full_name: fullName || user.fullName,
        phone: phone || user.phone,
        role: role || user.role,
        language_preference: languagePreference || user.languagePreference || 'en',
        address,
      });

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PROFILE_SYNC_ERROR', message: error.message },
      });
    }
  }

  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const profile = await UserRepository.findById(user.id, req.token);

      res.status(200).json({
        success: true,
        data: profile || user,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ME_ERROR', message: error.message },
      });
    }
  }

  static async updateLanguage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }

      const { language } = req.body;
      await UserRepository.updateLanguage(user.id, language);

      res.status(200).json({
        success: true,
        data: { languagePreference: language },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LANGUAGE_UPDATE_ERROR', message: error.message },
      });
    }
  }
}
