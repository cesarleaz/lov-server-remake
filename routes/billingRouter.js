import express from 'express';
import * as dbService from '../services/dbService.js';
import { z, validateQuery } from '../utils/validation.js';

const router = express.Router();

const balanceQuerySchema = z.object({
  ownerId: z.string().optional().default('default')
});

router.get('/billing/getBalance', validateQuery(balanceQuerySchema), async (req, res) => {
  try {
    const data = await dbService.getBalance(req.query.ownerId);
    return res.status(200).json({ balance: data.balance });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to fetch balance' });
  }
});

export default router;
