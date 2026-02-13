import { getCanvasData, saveCanvasData } from '../services/dbService.js';

function generateFileId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateNewImageElement(fileId, width, height, canvasData) {
  const aspectRatio = width / height;
  
  let x = 100, y = 100;
  
  const existingElements = canvasData.elements || [];
  if (existingElements.length > 0) {
    const lastElement = existingElements[existingElements.length - 1];
    x = (lastElement.x || 100) + (lastElement.width || 200) + 50;
  }

  return {
    id: fileId,
    type: 'image',
    x,
    y,
    width: Math.min(width, 800),
    height: Math.min(height, 800 / aspectRatio),
    fileId,
    version: 1,
    isDeleted: false,
    status: 'saved',
  };
}

export async function saveImageToCanvas(canvasId, filename, width = 800, height = 600) {
  const canvas = await getCanvasData(canvasId);
  
  if (!canvas || !canvas.data) {
    throw new Error('Canvas not found');
  }
  
  const canvasData = canvas.data;
  
  if (!canvasData.elements) canvasData.elements = [];
  if (!canvasData.files) canvasData.files = {};
  
  const fileId = generateFileId();
  const imageUrl = `/file/${filename}`;
  
  const fileData = {
    id: fileId,
    name: filename,
    mimeType: 'image/png',
    url: imageUrl,
    created: Date.now(),
  };
  
  const element = generateNewImageElement(fileId, width, height, canvasData);
  
  canvasData.elements.push(element);
  canvasData.files[fileId] = fileData;
  
  await saveCanvasData(canvasId, canvasData);
  
  return {
    element,
    file: fileData,
    imageUrl,
  };
}
