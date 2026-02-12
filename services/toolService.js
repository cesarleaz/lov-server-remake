import { writePlanTool } from '../tools/writePlan.js';
import { generateImage } from '../tools/generateImage.js';

const tools = new Map();

const TOOL_MAPPING = {
  generate_image: generateImage,
};

export async function initialize() {
  tools.clear();

  // Register system tools
  tools.set('write_plan', writePlanTool);

  // Lógica para registrar herramientas según configuración
  for (const [toolId, tool] of Object.entries(TOOL_MAPPING)) {
    // TODO: Aqui es donde se filtra las tools por las seleccionadas (modelos selecionados)
    tools.set(toolId, tool);
  }
}

export function getTool(toolId) {
  return tools.get(toolId);
}

export function listTools() {
  const result = [];
  for (const [id, tool] of tools.entries()) {
    if (tool.provider === 'system') continue;
    result.push({
      id,
      provider: tool.provider,
      type: tool.type,
      display_name: tool.display_name
    });
  }
  return result;
}

export function getAllTools() {
  return Array.from(tools.values());
}
