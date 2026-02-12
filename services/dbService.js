import mongoose from 'mongoose';
import { ChatSession } from '../models/chatSessionSchema.js';
import { ChatMessage } from '../models/chatMessageSchema.js';
import { Canvas } from '../models/canvasSchema.js';
import { ComfyWorkflow } from '../models/comfyWorkflowSchema.js';
import { Knowledge } from '../models/knowledgeSchema.js';
import { Template } from '../models/templateSchema.js';
import { DeviceSession } from '../models/deviceSessionSchema.js';
import { Billing } from '../models/billingSchema.js';
import { Task } from '../models/taskSchema.js';
import { MONGODB_URI } from '../constants.js';

let isConnected = false;

export async function initDb() {
    if (isConnected) {
        console.log('✅ Using existing MongoDB connection');
        return mongoose.connection;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

export async function getDb() {
    if (!isConnected) {
        await initDb();
    }
    return mongoose.connection;
}

export async function createChatSession(id, model, provider, canvasId, title = '') {
    await getDb();

    const session = new ChatSession({
        _id: id,
        model,
        provider,
        canvas_id: canvasId,
        title
    });

    await session.save();
}

export async function createMessage(sessionId, role, message) {
    await getDb();

    const chatMessage = new ChatMessage({
        session_id: sessionId,
        role,
        message: typeof message === 'string' ? message : JSON.stringify(message)
    });

    await chatMessage.save();
}

export async function getChatHistory(sessionId) {
    await getDb();

    const messages = await ChatMessage
        .find({ session_id: sessionId })
        .sort({ _id: 1 })
        .lean();

    return messages.map(msg => {
        try {
            return JSON.parse(msg.message);
        } catch (e) {
            return null;
        }
    }).filter(msg => msg !== null);
}

export async function listSessions(canvasId = null) {
    await getDb();

    const query = canvasId ? { canvas_id: canvasId } : {};

    const sessions = await ChatSession
        .find(query)
        .select('_id title model provider created_at updated_at')
        .sort({ updated_at: -1 })
        .lean();

    // Renombrar _id a id para compatibilidad
    return sessions.map(s => ({
        id: s._id,
        title: s.title,
        model: s.model,
        provider: s.provider,
        created_at: s.created_at,
        updated_at: s.updated_at
    }));
}

export async function createCanvas(id, name) {
    await getDb();

    const canvas = new Canvas({
        _id: id,
        name
    });

    await canvas.save();
}

export async function listCanvases() {
    await getDb();

    const canvases = await Canvas
        .find()
        .select('_id name description thumbnail created_at updated_at')
        .sort({ updated_at: -1 })
        .lean();

    // Renombrar _id a id para compatibilidad
    return canvases.map(c => ({
        id: c._id,
        name: c.name,
        description: c.description,
        thumbnail: c.thumbnail,
        created_at: c.created_at,
        updated_at: c.updated_at
    }));
}

export async function saveCanvasData(id, data, thumbnail = null) {
    await getDb();

    const updateData = {
        data,
        updated_at: new Date()
    };

    if (thumbnail !== null) {
        updateData.thumbnail = thumbnail;
    }

    await Canvas.updateOne(
        { _id: id },
        { $set: updateData }
    );
}

export async function getCanvasData(id) {
    await getDb();

    const canvas = await Canvas
        .findById(id)
        .select('data name')
        .lean();

    if (!canvas) return null;

    const sessions = await listSessions(id);

    return {
        data: canvas.data || {},
        name: canvas.name,
        sessions
    };
}

export async function deleteCanvas(id) {
    await getDb();

    await Canvas.deleteOne({ _id: id });
}

export async function renameCanvas(id, name) {
    await getDb();

    await Canvas.updateOne(
        { _id: id },
        { $set: { name, updated_at: new Date() } }
    );
}

export async function createComfyWorkflow(name, apiJson, description, inputs, outputs = null) {
    await getDb();

    const workflow = new ComfyWorkflow({
        name,
        api_json: apiJson,
        description,
        inputs,
        outputs
    });

    await workflow.save();
}

export async function listComfyWorkflows() {
    await getDb();

    const workflows = await ComfyWorkflow
        .find()
        .select('_id name description api_json inputs outputs')
        .sort({ _id: -1 })
        .lean();

    // Renombrar _id a id para compatibilidad
    return workflows.map(w => ({
        id: w._id.toString(),
        name: w.name,
        description: w.description,
        api_json: w.api_json,
        inputs: w.inputs,
        outputs: w.outputs
    }));
}

export async function deleteComfyWorkflow(id) {
    await getDb();

    await ComfyWorkflow.deleteOne({ _id: id });
}

export async function createKnowledge(payload) {
    await getDb();
    const knowledge = await Knowledge.create(payload);
    return knowledge.toObject();
}

export async function listKnowledge({ pageSize = 20, pageNumber = 1, search = '' } = {}) {
    await getDb();

    const safePageSize = Math.max(1, Math.min(Number(pageSize) || 20, 100));
    const safePageNumber = Math.max(1, Number(pageNumber) || 1);
    const trimmedSearch = String(search || '').trim();

    const query = trimmedSearch
        ? {
            $or: [
                { name: { $regex: trimmedSearch, $options: 'i' } },
                { description: { $regex: trimmedSearch, $options: 'i' } },
                { content: { $regex: trimmedSearch, $options: 'i' } }
            ]
        }
        : {};

    const [total, data] = await Promise.all([
        Knowledge.countDocuments(query),
        Knowledge.find(query)
            .sort({ updated_at: -1 })
            .skip((safePageNumber - 1) * safePageSize)
            .limit(safePageSize)
            .lean()
    ]);

    return {
        data,
        total,
        pageSize: safePageSize,
        pageNumber: safePageNumber
    };
}

export async function getKnowledgeById(id) {
    await getDb();
    return Knowledge.findById(id).lean();
}

export async function updateKnowledge(id, payload) {
    await getDb();
    return Knowledge.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
}

export async function deleteKnowledge(id) {
    await getDb();
    return Knowledge.findByIdAndDelete(id).lean();
}

export async function createTemplate(payload) {
    await getDb();
    const template = await Template.create(payload);
    return template.toObject();
}

export async function listTemplates() {
    await getDb();
    return Template.find().sort({ updated_at: -1 }).lean();
}

export async function getTemplateById(id) {
    await getDb();
    return Template.findById(id).lean();
}

export async function updateTemplate(id, payload) {
    await getDb();
    return Template.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
}

export async function deleteTemplate(id) {
    await getDb();
    return Template.findByIdAndDelete(id).lean();
}

export async function createDeviceSession(payload) {
    await getDb();
    const session = await DeviceSession.create(payload);
    return session.toObject();
}

export async function getDeviceSessionById(id) {
    await getDb();
    return DeviceSession.findById(id).lean();
}

export async function deleteDeviceSession(id) {
    await getDb();
    return DeviceSession.findByIdAndDelete(id).lean();
}

export async function getBalance(ownerId = 'default') {
    await getDb();
    const billing = await Billing.findOne({ owner_id: ownerId }).lean();
    return {
        balance: billing?.balance ?? 0,
        currency: billing?.currency ?? 'credits'
    };
}

export async function upsertBalance(ownerId = 'default', amount = 0, currency = 'credits') {
    await getDb();
    const billing = await Billing.findOneAndUpdate(
        { owner_id: ownerId },
        { $set: { balance: Number(amount) || 0, currency } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return billing.toObject();
}

export async function createTask(payload) {
    await getDb();
    const task = await Task.create(payload);
    return task.toObject();
}

export async function listTasks(filter = {}) {
    await getDb();
    return Task.find(filter).sort({ created_at: -1 }).lean();
}

export async function getTaskById(id) {
    await getDb();
    return Task.findById(id).lean();
}

export async function updateTask(id, payload) {
    await getDb();
    return Task.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
}

export async function deleteTask(id) {
    await getDb();
    return Task.findByIdAndDelete(id).lean();
}

export async function getComfyWorkflow(id) {
    await getDb();

    const workflow = await ComfyWorkflow
        .findById(id)
        .select('api_json')
        .lean();

    if (!workflow) return null;

    try {
        return typeof workflow.api_json === 'string'
            ? JSON.parse(workflow.api_json)
            : workflow.api_json;
    } catch (e) {
        throw new Error(`Stored workflow api_json is not valid JSON: ${e.message}`);
    }
}
