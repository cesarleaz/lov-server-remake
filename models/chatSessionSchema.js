import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        required: true
    },
    canvas_id: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        default: ''
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    collection: 'chat_sessions'
});

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
