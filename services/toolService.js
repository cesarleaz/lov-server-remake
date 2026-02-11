import { getConfig } from './configService.js';
import { writePlanTool } from '../tools/writePlan.js';
import { generateImageTool } from '../tools/generateImage.js';
import { generateVideoTool } from '../tools/generateVideo.js';
import { runMagicImageTool } from '../tools/runMagicImage.js';

const tools = new Map();

const TOOL_MAPPING = {
  generate_image: generateImageTool,
  generate_video: generateVideoTool,
  run_magic_image: runMagicImageTool
};

function shouldRegisterTool(tool, config) {
  if (tool.provider === 'internal' || tool.provider === 'system') {
    return true;
  }

  const providerConfig = config[tool.provider];
  return Boolean(providerConfig && (tool.provider === 'comfyui' || providerConfig.api_key));
}

export async function initialize() {
  tools.clear();

  // Register system tools
  tools.set('write_plan', writePlanTool);

  const config = getConfig();

  // Register provider/internal tools
  for (const [toolId, tool] of Object.entries(TOOL_MAPPING)) {
    const providerConfig = config[tool.provider];
    if (providerConfig && providerConfig.api_key) {
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
