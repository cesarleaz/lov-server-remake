import { getConfig } from '../services/configService.js';
import { fetchWithTimeout } from '../utils/httpUtils.js';

export const generateImageByGptImage1Jaaz = {
  name: 'generate_image_by_gpt_image_1_jaaz',
  display_name: 'GPT Image 1',
  type: 'image',
  provider: 'jaaz',
  description: 'Generate an image by gpt image model using text prompt or optionally pass images for reference or for editing. Use this model if you need to use multiple input images as reference.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The prompt for image generation.' },
      aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '4:3', '3:4', '9:16'], description: 'Aspect ratio of the image.' },
      input_images: { type: 'array', items: { type: 'string' }, description: 'Optional; One or multiple image IDs to use as reference.' }
    },
    required: ['prompt', 'aspect_ratio']
  },
  execute: async (args, context) => {
    const { prompt, aspect_ratio, input_images } = args;
    const config = getConfig();
    const jaazConfig = config.jaaz;

    if (!jaazConfig || !jaazConfig.api_key) {
      throw new Error('Jaaz API key is not configured');
    }

    const url = `${jaazConfig.url.replace(/\/$/, '')}/image/generations`;
    const headers = {
      'Authorization': `Bearer ${jaazConfig.api_key}`,
      'Content-Type': 'application/json'
    };

    const enhancedPrompt = `${prompt} Aspect ratio: ${aspect_ratio}`;
    const body = {
      model: 'openai/gpt-image-1',
      prompt: enhancedPrompt,
      n: 1,
      size: 'auto',
      input_images: input_images || []
    };

    console.log(`Calling Jaaz API: ${url}`);
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jaaz API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const imageUrl = data.data[0].url;
      // In a full implementation, we would download the image and save it to the canvas
      return `image generated successfully. URL: ${imageUrl}`;
    }

    throw new Error('No image data in response');
  }
};
