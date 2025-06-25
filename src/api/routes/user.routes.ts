import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
  getUserStats
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.get('/profile/:id', getProfile);
router.put('/profile', updateProfile);

// Following routes
router.post('/follow/:userId', followUser);
router.delete('/follow/:userId', unfollowUser);
router.get('/followers', getFollowers);
router.get('/followers/:id', getFollowers);
router.get('/following', getFollowing);
router.get('/following/:id', getFollowing);

// Search and stats
router.get('/search', searchUsers);
router.get('/stats', getUserStats);
router.get('/stats/:id', getUserStats);

export default router; 