import { createTask, enqueueTask, getTaskById } from '../services/taskService.js';

const DEFAULT_RESULT_URL_PREFIX = 'internal://magic-image';

export const runMagicImageTool = {
  name: 'run_magic_image',
  display_name: 'Run Magic Image',
  type: 'image',
  provider: 'internal',
  description: 'Run a magic image generation workflow using internal orchestration.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Prompt for magic image generation.' },
      style: { type: 'string', description: 'Optional style guidance for the generated image.' },
      result_url: { type: 'string', description: 'Optional precomputed result URL.' }
    },
    required: ['prompt']
  },
  execute: async (args, context) => {
    const task = await createTask({
      type: 'magic',
      input: {
        session_id: context.session_id,
        canvas_id: context.canvas_id,
        input: args
      }
    });

    await enqueueTask(task._id, async ({ setProgress }) => {
      await setProgress(15);
      await setProgress(65);
      await setProgress(90);

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
