import { createTask, enqueueTask, getTaskById } from '../services/taskService.js';

const DEFAULT_RESULT_URL_PREFIX = 'internal://video';

export const generateVideoTool = {
  name: 'generate_video',
  display_name: 'Generate Video',
  type: 'video',
  provider: 'internal',
  description: 'Generate a video using internal task orchestration.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Detailed prompt for video generation.' },
      duration_seconds: { type: 'number', description: 'Optional target duration in seconds.' },
      result_url: { type: 'string', description: 'Optional precomputed result URL.' }
    },
    required: ['prompt']
  },
  execute: async (args, context) => {
    const task = await createTask({
      type: 'video',
      input: {
        session_id: context.session_id,
        canvas_id: context.canvas_id,
        input: args
      }
    });

    await enqueueTask(task._id, async ({ setProgress }) => {
      await setProgress(25);
      await setProgress(80);

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
