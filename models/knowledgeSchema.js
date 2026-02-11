import mongoose from 'mongoose';

const knowledgeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
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

knowledgeSchema.index({ title: 'text', content: 'text' });

export const Knowledge = mongoose.model('Knowledge', knowledgeSchema);
