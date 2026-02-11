import { getConfig } from './configService.js';
import { getDb } from './dbService.js';
import { writePlanTool } from '../tools/writePlan.js';
import { generateImageByGptImage1Jaaz } from '../tools/generateImageJaaz.js';

const tools = new Map();

const TOOL_MAPPING = {
  'generate_image_by_gpt_image_1_jaaz': generateImageByGptImage1Jaaz,
};

export async function initialize() {
  tools.clear();

  // Register system tools
  tools.set('write_plan', writePlanTool);

  const config = getConfig();

  // Logic to register tools based on config
  for (const [toolId, tool] of Object.entries(TOOL_MAPPING)) {
    const providerConfig = config[tool.provider];
    if (providerConfig && (tool.provider === 'comfyui' || providerConfig.api_key)) {
      tools.set(toolId, tool);
    }
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
