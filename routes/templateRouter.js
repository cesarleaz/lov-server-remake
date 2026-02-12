import express from 'express';
import * as dbService from '../services/dbService.js';
import { z, validateBody, validateParams } from '../utils/validation.js';

const router = express.Router();

const templateBodySchema = z.object({
  name: z.string().min(1),
  canvas_id: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? '' : String(v))),
  session_id: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? '' : String(v))),
  cover_image: z.string().optional().default(''),
  message: z.any().optional().nullable(),
  canvas_data: z.object({
    elements: z.array(z.any()).optional().default([]),
    appState: z.record(z.any()).optional().default({}),
    files: z.record(z.any()).optional().default({})
  }),
  metadata: z.any().optional().default({})
});

const idParamSchema = z.object({ id: z.string().min(1) });

router.get('/template/list', async (req, res) => {
  try {
    const list = await dbService.listTemplates();
    return res.status(200).json({ data: { list } });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to list templates' });
  }
});

router.get('/template/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const data = await dbService.getTemplateById(req.params.id);
    if (!data) return res.status(404).json({ detail: 'Template not found' });
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to fetch template' });
  }
});

router.post('/template/create', validateBody(templateBodySchema), async (req, res) => {
  try {
    const created = await dbService.createTemplate(req.body);
    return res.status(201).json({
      success: true,
      template_id: created._id,
      share_url: `/template/${created._id}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to create template' });
  }
});

router.put('/template/:id', validateParams(idParamSchema), validateBody(templateBodySchema.partial()), async (req, res) => {
  try {
    const updated = await dbService.updateTemplate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, detail: 'Template not found' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to update template' });
  }
});

router.delete('/template/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const deleted = await dbService.deleteTemplate(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, detail: 'Template not found' });
    return res.status(200).json({ success: true, id: deleted._id });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message || 'Failed to delete template' });
  }
});

export default router;
