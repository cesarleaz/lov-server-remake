import express from 'express';
import { z, validateBody, validateParams, validateQuery } from '../utils/validation.js';
import { createTask, enqueueTask, getTaskById, searchTasks } from '../services/taskService.js';
import { handleMagic } from '../services/chatService.js';

const router = express.Router();

const generationBodySchema = z.object({
  input: z.record(z.any()).optional().default({}),
  session_id: z.string().optional(),
  canvas_id: z.string().optional(),
  text_model: z.object({
    model: z.string().min(1),
    provider: z.string().min(1)
  }).optional(),
  messages: z.array(z.any()).optional(),
  tool_list: z.array(z.any()).optional(),
  system_prompt: z.string().optional(),
  metadata: z.record(z.any()).optional().default({})
});

const taskStatusParamSchema = z.object({
  task_id: z.string().min(1)
});

const taskSearchQuerySchema = z.object({
  task_id: z.string().min(1).optional(),
  task_ids: z.string().optional()
}).refine((query) => Boolean(query.task_id || query.task_ids), {
  message: 'task_id or task_ids is required'
});

async function createAndEnqueueTask(type, req, res, processor) {
  const task = await createTask({
    type,
    input: req.body
  });

  enqueueTask(task._id, processor).catch((error) => {
    console.error(`Failed to enqueue ${type} task ${task._id}:`, error);
  });

  return res.status(202).json({
    task_id: task._id,
    status: task.status,
    type,
    metadata: req.body.metadata || {}
  });
}

router.post('/image/generations', validateBody(generationBodySchema), async (req, res) => {
  try {
    return createAndEnqueueTask('image', req, res, async ({ setProgress }) => {
      await setProgress(30);
      await new Promise((resolve) => setTimeout(resolve, 80));
      await setProgress(70);

      return {
        result_url: req.body.input?.result_url || null
      };
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to create image generation task' });
  }
});

router.post('/image/magic', validateBody(generationBodySchema), async (req, res) => {
  try {
    return createAndEnqueueTask('magic', req, res, async ({ setProgress }) => {
      await setProgress(20);

      if (Array.isArray(req.body.messages) && req.body.messages.length > 0 && req.body.session_id && req.body.text_model) {
        await handleMagic({
          session_id: req.body.session_id,
          canvas_id: req.body.canvas_id || '',
          text_model: req.body.text_model,
          messages: req.body.messages,
          tool_list: req.body.tool_list || [],
          system_prompt: req.body.system_prompt || ''
        });
      }

      await setProgress(90);
      return {
        result_url: req.body.input?.result_url || null
      };
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to create magic generation task' });
  }
});

router.post('/video/generations', validateBody(generationBodySchema), async (req, res) => {
  try {
    return createAndEnqueueTask('video', req, res, async ({ setProgress }) => {
      await setProgress(25);
      await new Promise((resolve) => setTimeout(resolve, 120));
      await setProgress(75);

      return {
        result_url: req.body.input?.result_url || null
      };
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to create video generation task' });
  }
});

router.get('/video/status/:task_id', validateParams(taskStatusParamSchema), async (req, res) => {
  try {
    const task = await getTaskById(req.params.task_id);

    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    return res.json({
      task_id: task._id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      result_url: task.result_url,
      error: task.error,
      created_at: task.created_at,
      updated_at: task.updated_at
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to fetch task status' });
  }
});

router.get('/task/search', validateQuery(taskSearchQuerySchema), async (req, res) => {
  try {
    const taskIds = req.query.task_ids
      ? req.query.task_ids.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const tasks = await searchTasks({
      taskId: req.query.task_id,
      taskIds
    });

    return res.json({
      tasks: tasks.map((task) => ({
        task_id: task._id,
        type: task.type,
        status: task.status,
        input: task.input,
        result_url: task.result_url,
        error: task.error,
        progress: task.progress,
        created_at: task.created_at,
        updated_at: task.updated_at
      }))
    });
  } catch (error) {
    return res.status(500).json({ detail: error.message || 'Failed to search tasks' });
  }
});

export default router;
