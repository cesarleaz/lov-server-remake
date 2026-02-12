import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  canvas_id: {
    type: String,
    default: ''
  },
  session_id: {
    type: String,
    default: ''
  },
  cover_image: {
    type: String,
    default: ''
  },
  message: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  canvas_data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
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
  collection: 'templates'
});

export const Template = mongoose.model('Template', templateSchema);
