import express from 'express';
import { handleChat, cancelChat, handleMagic, cancelMagic } from '../services/chatService.js';
import { z, validateBody, validateParams } from '../utils/validation.js';

const router = express.Router();

const messageSchema = z.object({
  role: z.string(),
  content: z.any().optional(),
  tool_calls: z.any().optional(),
  tool_call_id: z.any().optional()
});

const chatBodySchema = z.object({
  session_id: z.string().min(1),
  canvas_id: z.string().optional().default(''),
  text_model: z.object({
    model: z.string().min(1),
    provider: z.string().min(1)
  }),
  messages: z.array(messageSchema).min(1),
  tool_list: z.array(z.any()).optional().default([]),
  system_prompt: z.string().optional().default('')
});

const sessionParamSchema = z.object({
  session_id: z.string().min(1)
});

router.post('/chat', validateBody(chatBodySchema), async (req, res) => {
  handleChat(req.body); // Run in background
  res.json({ status: 'done' });
});

router.post('/cancel/:session_id', validateParams(sessionParamSchema), (req, res) => {
  const cancelled = cancelChat(req.params.session_id);
  res.json({ status: cancelled ? 'cancelled' : 'not_found_or_done' });
});

router.post('/magic', validateBody(chatBodySchema), async (req, res) => {
  handleMagic(req.body); // Run in background
  res.json({ status: 'done' });
});

router.post('/magic/cancel/:session_id', validateParams(sessionParamSchema), (req, res) => {
  const cancelled = cancelMagic(req.params.session_id);
  res.json({ status: cancelled ? 'cancelled' : 'not_found_or_done' });
});

export default router;
