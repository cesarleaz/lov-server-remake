import { Server } from 'socket.io';

let io;
const activeConnections = new Map();

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    activeConnections.set(socket.id, socket.handshake.auth || {});

    socket.emit('connected', { status: 'connected' });

    socket.on('ping', (data) => {
      socket.emit('pong', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      activeConnections.delete(socket.id);
    });
  });

  return io;
}

export async function sendToWebsocket(sessionId, event, canvasId = null) {
  if (!io) return;
  const payload = {
    canvas_id: canvasId,
    session_id: sessionId,
    ...event
  };

  for (const socketId of activeConnections.keys()) {
    io.to(socketId).emit('session_update', payload);
  }
}

export async function broadcastInitDone() {
  if (!io) return;
  io.emit('init_done', { type: 'init_done' });
}
