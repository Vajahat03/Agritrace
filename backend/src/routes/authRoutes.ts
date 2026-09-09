import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { registerSchema, updateProfileSchema } from '../validators';

const router = Router();

router.post('/sync-profile', authMiddleware, validate(registerSchema), AuthController.syncProfile);
router.get('/me', authMiddleware, AuthController.getMe);
router.patch('/profile', authMiddleware, validate(updateProfileSchema), AuthController.syncProfile);
router.post('/language', authMiddleware, AuthController.updateLanguage);

export default router;
