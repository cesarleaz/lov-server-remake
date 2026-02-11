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
  code: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  session_token: {
    type: String,
    default: null
  },
  refresh_token_hash: {
    type: String,
    default: null
  },
  refresh_token_jti: {
    type: String,
    default: null
  },
  code_expires_at: {
    type: Date,
    default: null,
    index: true
  },
  refresh_token_expires_at: {
    type: Date,
    default: null
  },
  authorized_at: {
    type: Date,
    default: null
  },
  revoked_at: {
    type: Date,
    default: null,
    index: true
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

deviceSessionSchema.index({ code: 1, status: 1 });

export const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);
