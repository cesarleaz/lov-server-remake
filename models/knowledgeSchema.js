import mongoose from 'mongoose';

const knowledgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  cover: {
    type: String,
    default: ''
  },
  is_public: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'knowledge'
});

knowledgeSchema.index({ name: 'text', description: 'text', content: 'text' });

export const Knowledge = mongoose.model('Knowledge', knowledgeSchema);
