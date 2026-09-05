import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '../../middleware/requireAuth';

export const authRouter: Router = Router();

// Public Authentication Routes
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);

// GitHub OAuth Routes
authRouter.get('/github', AuthController.githubLogin);
authRouter.get('/github/callback', AuthController.githubCallback);

// Protected Routes
authRouter.get('/me', requireAuth, AuthController.getMe);
