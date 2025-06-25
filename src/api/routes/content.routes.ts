import { Router } from 'express';
import {
  createContent,
  getContent,
  updateContent,
  deleteContent,
  moderateContent,
  likeContent,
  shareContent,
  reportContent,
  getFeed
} from '../controllers/content.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (with optional auth)
router.get('/feed', optionalAuth, getFeed);
router.get('/:id', optionalAuth, getContent);

// Protected routes
router.use(authenticateToken);

// Content CRUD
router.post('/', createContent);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

// Social interactions
router.post('/:id/like', likeContent);
router.post('/:id/share', shareContent);
router.post('/:id/report', reportContent);

// Moderation (admin only)
router.post('/:id/moderate', moderateContent);

export default router; 