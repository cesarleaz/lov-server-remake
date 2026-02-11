import mongoose from 'mongoose';

const deviceSessionSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    default: null,
    index: true
  },
  device_id: {
    type: String,
    required: true,
    index: true
  },
  session_token: {
    type: String,
    default: null
  },
  expires_at: {
    type: Date,
    default: null
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
  collection: 'device_sessions'
});

export const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);
