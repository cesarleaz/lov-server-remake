import { createTask, enqueueTask, getTaskById } from '../services/taskService.js';

const DEFAULT_RESULT_URL_PREFIX = 'internal://image';

export const generateImageTool = {
  name: 'generate_image',
  display_name: 'Generate Image',
  type: 'image',
  provider: 'internal',
  description: 'Generate an image using internal task orchestration.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Detailed prompt for image generation.' },
      aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '4:3', '3:4', '9:16'], description: 'Aspect ratio of the generated image.' },
      result_url: { type: 'string', description: 'Optional precomputed result URL.' }
    },
    required: ['prompt']
  },
  execute: async (args, context) => {
    const task = await createTask({
      type: 'image',
      input: {
        session_id: context.session_id,
        canvas_id: context.canvas_id,
        input: args
      }
    });

    await enqueueTask(task._id, async ({ setProgress }) => {
      await setProgress(20);
      await setProgress(70);

      return {
        result_url: args.result_url || `${DEFAULT_RESULT_URL_PREFIX}/${task._id}`
      };
    });

    const updatedTask = await getTaskById(task._id);

    return {
      task_id: updatedTask?._id?.toString() || task._id?.toString(),
      status: updatedTask?.status || 'completed',
      result_url: updatedTask?.result_url || args.result_url || `${DEFAULT_RESULT_URL_PREFIX}/${task._id}`
    };
  }
};
