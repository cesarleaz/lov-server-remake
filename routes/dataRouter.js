import express from 'express';
import * as dbService from '../services/dbService.js';
import { z, validateBody, validateParams, validateQuery } from '../utils/validation.js';

const router = express.Router();

const knowledgeListQuery = z.object({
  pageSize: z.coerce.number().int().positive().optional().default(20),
  pageNumber: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default('')
});
const knowledgeBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(''),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.any().optional().default({})
});
const idParamSchema = z.object({ id: z.string().min(1) });

const templateBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  canvas_payload: z.any(),
  metadata: z.any().optional().default({})
});

const billingGetBalanceQuery = z.object({
  ownerId: z.string().optional().default('default')
});

router.get('/knowledge/list', validateQuery(knowledgeListQuery), async (req, res) => {
  const result = await dbService.listKnowledge(req.query);
  res.json(result);
});

router.get('/knowledge/:id', validateParams(idParamSchema), async (req, res) => {
  const data = await dbService.getKnowledgeById(req.params.id);
  if (!data) return res.status(404).json({ detail: 'Knowledge not found' });
  return res.json({ data });
});

router.post('/knowledge/create', validateBody(knowledgeBodySchema), async (req, res) => {
  const created = await dbService.createKnowledge(req.body);
  res.json({ id: created._id, data: created });
});

router.post('/knowledge/:id/update', validateParams(idParamSchema), validateBody(knowledgeBodySchema.partial()), async (req, res) => {
  const updated = await dbService.updateKnowledge(req.params.id, req.body);
  if (!updated) return res.status(404).json({ detail: 'Knowledge not found' });
  res.json({ id: updated._id, data: updated });
});

router.delete('/knowledge/:id/delete', validateParams(idParamSchema), async (req, res) => {
  const deleted = await dbService.deleteKnowledge(req.params.id);
  if (!deleted) return res.status(404).json({ detail: 'Knowledge not found' });
  res.json({ id: deleted._id });
});

router.post('/template/create', validateBody(templateBodySchema), async (req, res) => {
  const created = await dbService.createTemplate(req.body);
  res.json({ id: created._id });
});

router.get('/template/:id', validateParams(idParamSchema), async (req, res) => {
  const data = await dbService.getTemplateById(req.params.id);
  if (!data) return res.status(404).json({ detail: 'Template not found' });
  res.json({ data });
});

router.get('/billing/getBalance', validateQuery(billingGetBalanceQuery), async (req, res) => {
  const data = await dbService.getBalance(req.query.ownerId);
  res.json(data);
});

export default router;
