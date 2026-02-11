import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const taskSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => nanoid()
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed'],
    index: true
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result_url: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'tasks',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

taskSchema.virtual('task_id').get(function taskIdGetter() {
  return this._id;
});

export const Task = mongoose.model('Task', taskSchema);
