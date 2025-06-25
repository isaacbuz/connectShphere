import { Router } from 'express';
import { getTokenBalance, transferToken, getContentOwnership, registerContent, vote, getVotes } from '../controllers/blockchain.controller';

const router = Router();

router.get('/token/balance', getTokenBalance);
router.post('/token/transfer', transferToken);
router.get('/content/:id/ownership', getContentOwnership);
router.post('/content/register', registerContent);
router.post('/governance/vote', vote);
router.get('/governance/votes', getVotes);

export default router; 