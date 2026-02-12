import express from 'express';
import * as dbService from '../services/dbService.js';
import { z, validateBody, validateParams, validateQuery } from '../utils/validation.js';

const router = express.Router();

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

router.get('/knowledge/list', validateQuery(knowledgeListQuery), async (req, res) => {
  try {
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
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to list knowledge' });
  }
});

router.get('/knowledge/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const data = await dbService.getKnowledgeById(req.params.id);
    if (!data) return res.status(404).json({ detail: 'Knowledge not found' });
    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to fetch knowledge entry' });
  }
});

router.post('/knowledge/create', validateBody(knowledgeBodySchema), async (req, res) => {
  try {
    const created = await dbService.createKnowledge(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to create knowledge entry' });
  }
});

router.put('/knowledge/:id', validateParams(idParamSchema), validateBody(knowledgeBodySchema.partial()), async (req, res) => {
  try {
    const updated = await dbService.updateKnowledge(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, detail: 'Knowledge not found' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to update knowledge entry' });
  }
});

router.delete('/knowledge/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const deleted = await dbService.deleteKnowledge(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, detail: 'Knowledge not found' });
    return res.status(200).json({ success: true, id: deleted._id });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to delete knowledge entry' });
  }
});

export default router;
