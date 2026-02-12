import { DEFAULT_PROVIDERS_CONFIG } from './configService.js';
import { getTool } from './toolService.js';
import { fetchWithTimeout } from '../utils/httpUtils.js';
import { VERTEX_API_KEY } from '../constants.js';

const PLANNER_SYSTEM_PROMPT = `
You are a design planning writing agent. Answer and write plan in the SAME LANGUAGE as the user's prompt. You should do:
- Step 1. If it is a complex task requiring multiple steps, write a execution plan for the user's request using the SAME LANGUAGE AS THE USER'S PROMPT. You should breakdown the task into high level steps for the other agents to execute.
- Step 2. If it is a image/video generation or editing task, transfer the task to image_video_creator agent to generate the image based on the plan IMMEDIATELY, no need to ask for user's approval.

IMPORTANT RULES:
1. You MUST complete the write_plan tool call and wait for its result BEFORE attempting to transfer to another agent
2. Do NOT call multiple tools simultaneously
3. Always wait for the result of one tool call before making another

ALWAYS PAY ATTENTION TO IMAGE QUANTITY!
- If user specifies a number (like "20 images", "generate 15 pictures"), you MUST include this exact number in your plan
- When transferring to image_video_creator, clearly communicate the required quantity
- NEVER ignore or change the user's specified quantity
- If no quantity is specified, assume 1 image
`;

const CREATOR_SYSTEM_PROMPT = `
You are a image video creator. You can create image or video from text prompt or image.
You can write very professional image prompts to generate aesthetically pleasing images that best fulfilling and matching the user's request.

1. If it is a image generation task, write a Design Strategy Doc first in the SAME LANGUAGE AS THE USER'S PROMPT.
2. Call generate_image tool to generate the image based on the plan immediately, use a detailed and professional image prompt according to your design strategy plan, no need to ask for user's approval.
3. If it is a video generation task, use video generation tools to generate the video.
`;

const AGENTS = {
  planner: {
    name: 'planner',
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    tools: ['write_plan', 'transfer_to_creator']
  },
  image_video_creator: {
    name: 'image_video_creator',
    systemPrompt: CREATOR_SYSTEM_PROMPT,
    tools: ['generate_image', 'transfer_to_planner']
  }
};

async function callLLM(agent, messages, config) {
  // const provider = config.text_model.provider;
  // const model = config.text_model.model;

  // const providerConfig = DEFAULT_PROVIDERS_CONFIG[provider];

  // if (!providerConfig) {
  //   throw new Error(`Provider ${provider} is not configured`);
  // }

  // const url = providerConfig.url.replace(/\/$/, '') + (provider === 'ollama' ? '/api/chat' : '/chat/completions');

  // Construct tools for the LLM
  const agentTools = agent.tools.map(toolId => {
    if (toolId.startsWith('transfer_to_')) {
      const targetAgentName = toolId.replace('transfer_to_', '');
      return {
        type: 'function',
        function: {
          name: toolId,
          description: `Transfer the conversation to the ${targetAgentName} agent.`,
          parameters: { type: 'object', properties: {} }
        }
      };
    }
    const tool = getTool(toolId);
    if (!tool) return null;
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  }).filter(t => t !== null);

  const llmMessages = [
    { role: 'system', content: agent.systemPrompt },
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id
    }))
  ];

  const body = {
    model: 'gemini-3-flash-preview',
    messages: llmMessages,
    tools: agentTools.length > 0 ? agentTools : undefined,
    tool_choice: agentTools.length > 0 ? 'auto' : undefined
  };

  const response = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${VERTEX_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: config.abortSignal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

export async function runSwarm(messages, context, onUpdate) {
  let activeAgent = AGENTS.planner;
  let currentMessages = [...messages];
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;

    if (context.abortSignal?.aborted) {
      throw new Error('Request cancelled');
    }

    const assistantMessage = await callLLM(activeAgent, currentMessages, context);
    currentMessages.push({ ...assistantMessage, role: 'assistant' });

    if (onUpdate) {
      onUpdate({ type: 'message', message: assistantMessage });
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (toolName.startsWith('transfer_to_')) {
          const targetAgentName = toolName.replace('transfer_to_', '');

          activeAgent = AGENTS[targetAgentName === 'creator' ? 'image_video_creator' : targetAgentName];

          console.log(`Switching to agent: ${activeAgent.name}`);

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Transferred to ${activeAgent.name}.`
          });
        } else {
          const tool = getTool(toolName);

          if (tool) {
            console.log(`Executing tool: ${toolName}`);

            if (onUpdate) {
              onUpdate({
                type: 'tool_call_progress',
                tool_call_id: toolCall.id,
                session_id: context.session_id,
                update: `Executing ${toolName}`
              });

              onUpdate({ type: 'tool_start', tool: toolName, args });
            }

            try {
              if (context.abortSignal?.aborted) {
                throw new Error('Request cancelled');
              }

              const result = await tool.execute(args, context);

              console.log({ result })
              
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result
              });

              if (onUpdate) {
                onUpdate({
                  type: 'tool_call_progress',
                  tool_call_id: toolCall.id,
                  session_id: context.session_id,
                  update: ''
                });

                onUpdate({ type: 'tool_end', tool: toolName, result });
              }
            } catch (error) {
              console.log(`Failed execute tool ${toolName}: ${error.message}`)
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Error: ${error.message}`
              });

              if (onUpdate) {
                onUpdate({
                  type: 'tool_call_progress',
                  tool_call_id: toolCall.id,
                  session_id: context.session_id,
                  update: `Error: ${error.message}`
                });
              }
            }
          }
        }
      }
    } else {
      // No more tool calls, we are done
      break;
    }
  }

  return currentMessages;
}
