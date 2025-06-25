import { Router } from 'express';
import { moderate, personalize, agentAction } from '../controllers/ai.controller';

const router = Router();

router.post('/moderate', moderate);
router.post('/personalize', personalize);
router.post('/agent', agentAction);

export default router; 