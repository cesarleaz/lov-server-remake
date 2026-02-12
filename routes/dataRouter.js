import express from 'express';
import * as dbService from '../services/dbService.js';
import { z, validateBody, validateParams, validateQuery } from '../utils/validation.js';
import { requireAuthorization } from '../middleware/authMiddleware.js';

// Deprecated compatibility router. Not mounted by default.
// Kept aligned with current contract to avoid regressions if mounted later.
const router = express.Router();

router.use('/knowledge', requireAuthorization);
router.use('/template', requireAuthorization);
router.use('/billing', requireAuthorization);

const knowledgeListQuery = z.object({
  pageSize: z.coerce.number().int().positive().optional().default(10),
  pageNumber: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default('')
});

const knowledgeBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  cover: z.string().optional().default(''),
  is_public: z.boolean().optional().default(false),
  content: z.string().optional().default(''),
  metadata: z.any().optional().default({})
});

const idParamSchema = z.object({ id: z.string().min(1) });

const templateBodySchema = z.object({
  name: z.string().min(1),
  canvas_id: z.union([z.string(), z.number()]).optional(),
  session_id: z.union([z.string(), z.number()]).optional(),
  cover_image: z.string().optional().default(''),
  message: z.any().optional().nullable(),
  canvas_data: z.object({
    elements: z.array(z.any()).optional().default([]),
    appState: z.record(z.any()).optional().default({}),
    files: z.record(z.any()).optional().default({})
  }),
  metadata: z.any().optional().default({})
});

const billingGetBalanceQuery = z.object({
  ownerId: z.string().optional()
});

router.get('/knowledge/list', validateQuery(knowledgeListQuery), async (req, res) => {
  const result = await dbService.listKnowledge(req.query);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return res.json({
    data: {
      list: result.data,
      pagination: {
        page_size: result.pageSize,
        page_number: result.pageNumber,
        total_pages: totalPages,
        total: result.total
      }
    }
  });
});

router.get('/knowledge/:id', validateParams(idParamSchema), async (req, res) => {
  const data = await dbService.getKnowledgeById(req.params.id);
  if (!data) return res.status(404).json({ detail: 'Knowledge not found' });
  return res.json({ data });
});

router.post('/knowledge/create', validateBody(knowledgeBodySchema), async (req, res) => {
  const created = await dbService.createKnowledge(req.body);
  res.json({ success: true, data: created });
});

router.put('/knowledge/:id', validateParams(idParamSchema), validateBody(knowledgeBodySchema.partial()), async (req, res) => {
  const updated = await dbService.updateKnowledge(req.params.id, req.body);
  if (!updated) return res.status(404).json({ detail: 'Knowledge not found' });
  res.json({ success: true, data: updated });
});

router.delete('/knowledge/:id', validateParams(idParamSchema), async (req, res) => {
  const deleted = await dbService.deleteKnowledge(req.params.id);
  if (!deleted) return res.status(404).json({ detail: 'Knowledge not found' });
  res.json({ success: true, id: deleted._id });
});

router.post('/template/create', validateBody(templateBodySchema), async (req, res) => {
  const created = await dbService.createTemplate(req.body);
  res.json({ success: true, template_id: created._id, share_url: `/template/${created._id}` });
});

router.get('/template/:id', validateParams(idParamSchema), async (req, res) => {
  const data = await dbService.getTemplateById(req.params.id);
  if (!data) return res.status(404).json({ detail: 'Template not found' });
  res.json({ data });
});

router.get('/billing/getBalance', validateQuery(billingGetBalanceQuery), async (req, res) => {
  const data = await dbService.getBalance(req.query.ownerId || req.auth.userId || 'default');
  res.json({ balance: data.balance });
});

export default router;
