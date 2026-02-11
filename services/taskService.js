import { Task } from '../models/taskSchema.js';
import { getDb } from './dbService.js';

const queuedJobs = [];
let isWorkerActive = false;

function clampProgress(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

async function updateTaskTransactional(taskId, payload, expectedStatuses = null) {
  await getDb();

  const query = { _id: taskId };
  if (Array.isArray(expectedStatuses) && expectedStatuses.length > 0) {
    query.status = { $in: expectedStatuses };
  }

  return Task.findOneAndUpdate(query, { $set: payload }, { new: true }).lean();
}

async function processQueue() {
  if (isWorkerActive) return;
  isWorkerActive = true;

  while (queuedJobs.length > 0) {
    const job = queuedJobs.shift();
    const { taskId, handler } = job;

    const processingTask = await updateTaskTransactional(
      taskId,
      { status: 'processing', progress: 1, error: null },
      ['pending']
    );

    if (!processingTask) {
      continue;
    }

    try {
      const result = await handler({
        setProgress: async (progress) => {
          await updateTaskTransactional(taskId, { progress: clampProgress(progress) }, ['processing']);
        }
      });

      await updateTaskTransactional(taskId, {
        status: 'completed',
        progress: 100,
        result_url: result?.result_url || null,
        error: null
      }, ['processing']);
    } catch (error) {
      await updateTaskTransactional(taskId, {
        status: 'failed',
        progress: 100,
        error: error.message || 'Task failed unexpectedly'
      }, ['processing']);
    }
  }

  isWorkerActive = false;
}

export async function createTask({ task_id, type, input = {} }) {
  await getDb();

  const task = await Task.create({
    _id: task_id,
    type,
    status: 'pending',
    input,
    progress: 0,
    result_url: null,
    error: null
  });

  return task.toObject();
}

export async function enqueueTask(taskId, handler) {
  queuedJobs.push({ taskId, handler });
  await processQueue();
}

export async function getTaskById(taskId) {
  await getDb();
  return Task.findById(taskId).lean();
}

export async function searchTasks({ taskId, taskIds = [] }) {
  await getDb();

  const ids = [];
  if (taskId) ids.push(taskId);
  for (const id of taskIds) {
    if (id && !ids.includes(id)) ids.push(id);
  }

  if (ids.length === 0) {
    return [];
  }

  return Task.find({ _id: { $in: ids } })
    .sort({ created_at: -1 })
    .lean();
}

export async function updateTaskProgress(taskId, progress) {
  return updateTaskTransactional(taskId, { progress: clampProgress(progress) }, ['processing']);
}

export async function updateTaskStatus(taskId, payload, expectedStatuses = null) {
  return updateTaskTransactional(taskId, payload, expectedStatuses);
}
