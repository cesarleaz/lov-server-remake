import express from 'express';
import * as dbService from '../services/dbService.js';
import { nanoid } from 'nanoid';
import { z, validateBody, validateParams } from '../utils/validation.js';
import { handleChat } from '../services/chatService.js';

const router = express.Router();

const canvasIdParam = z.object({ id: z.string().min(1) });
const createSchema = z.object({
  name: z.string().optional().default('Untitled'),
  canvas_id: z.string().optional(),

  // Adicional para handleChat
  messages: z.array(z.any()),
  session_id: z.string().optional(),
  text_model: z.object({
    model: z.string(),
    provider: z.string()
  }),
  tool_list: z.array(z.string()).optional(),
  system_prompt: z.string().optional()
});
const renameSchema = z.object({ name: z.string().min(1) });
const saveSchema = z.object({ data: z.any(), thumbnail: z.any().optional().nullable() });

router.get('/canvas/list', async (req, res) => {
  res.json(await dbService.listCanvases());
});

router.post('/canvas/create', async (req, res) => {
  try {
    const { canvasId } = await dbService.createCanvas();
    handleChat({ ...req.body, canvas_id: canvasId })
    res.json({ canvasId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.get('/canvas/:id', validateParams(canvasIdParam), async (req, res) => {
  try {
    const data = await dbService.getCanvasData(req.params.id);
    if (!data) return res.status(404).json({ detail: 'Canvas not found' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

router.post('/canvas/:id/save', validateParams(canvasIdParam), validateBody(saveSchema), async (req, res) => {
  await dbService.saveCanvasData(req.params.id, req.body.data, req.body.thumbnail);
  res.json({ id: req.params.id });
});

router.post('/canvas/:id/rename', validateParams(canvasIdParam), validateBody(renameSchema), async (req, res) => {
  await dbService.renameCanvas(req.params.id, req.body.name);
  res.json({ id: req.params.id });
});

router.delete('/canvas/:id/delete', validateParams(canvasIdParam), async (req, res) => {
  await dbService.deleteCanvas(req.params.id);
  res.json({ id: req.params.id });
});

export default router;
