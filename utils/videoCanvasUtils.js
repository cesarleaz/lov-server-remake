import { getCanvasData, saveCanvasData } from '../services/dbService.js';

function generateVideoFileId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateNewVideoElement(fileId, width, height, canvasData) {
  let x = 100, y = 100;
  
  const existingElements = canvasData.elements || [];
  if (existingElements.length > 0) {
    const lastElement = existingElements[existingElements.length - 1];
    x = (lastElement.x || 100) + (lastElement.width || 200) + 50;
  }

  return {
    id: fileId,
    type: 'video',
    x,
    y,
    width: width || 640,
    height: height || 360,
    fileId,
    version: 1,
    isDeleted: false,
    status: 'saved',
  };
}

export async function saveVideoToCanvas(canvasId, filename, width = 640, height = 360) {
  const canvas = await getCanvasData(canvasId);
  
  if (!canvas || !canvas.data) {
    throw new Error('Canvas not found');
  }
  
  const canvasData = canvas.data;
  
  if (!canvasData.elements) canvasData.elements = [];
  if (!canvasData.files) canvasData.files = {};
  
  const fileId = generateVideoFileId();
  const videoUrl = `/file/${filename}`;
  
  const fileData = {
    id: fileId,
    name: filename,
    mimeType: 'video/mp4',
    url: videoUrl,
    created: Date.now(),
  };
  
  const element = generateNewVideoElement(fileId, width, height, canvasData);
  
  canvasData.elements.push(element);
  canvasData.files[fileId] = fileData;
  
  await saveCanvasData(canvasId, canvasData);
  
  return {
    element,
    file: fileData,
    videoUrl,
  };
}
