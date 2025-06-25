import { Router } from 'express';
import {
  register,
  login,
  loginWithWallet,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/login/wallet', loginWithWallet);

// Protected routes
router.use(authenticateToken);

router.get('/me', getCurrentUser);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.put('/password', changePassword);

export default router; 