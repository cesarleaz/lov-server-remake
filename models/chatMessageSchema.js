import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: false 
  },
  collection: 'chat_messages'
});

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
