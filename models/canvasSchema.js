import mongoose from 'mongoose';

const canvasSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Untitled'
  },
  description: {
    type: String,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  collection: 'canvases'
});

export const Canvas = mongoose.model('Canvas', canvasSchema);
