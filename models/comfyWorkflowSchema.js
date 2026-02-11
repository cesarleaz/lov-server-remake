import mongoose from 'mongoose';

const comfyWorkflowSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    api_json: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null
    },
    inputs: {
        type: String,
        default: null
    },
    outputs: {
        type: String,
        default: null
    }
}, {
    timestamps: false,
    collection: 'comfy_workflows'
});

export const ComfyWorkflow = mongoose.model('ComfyWorkflow', comfyWorkflowSchema);