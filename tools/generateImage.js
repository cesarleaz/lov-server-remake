import { VERTEX_API_KEY } from '../constants.js'
import { saveFile } from '../lib/r2.js'
import { fetchWithTimeout } from '../utils/httpUtils.js'

export const generateImage = {
  name: 'generate_image',
  display_name: 'Nano Banana Pro',
  type: 'image',
  provider: 'google',
  description:
    'Generate an image by Nano Banana image model using text prompt or optionally pass images for reference or for editing. Use this model if you need to use multiple input images as reference.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt for image generation.'
      },
      aspect_ratio: {
        type: 'string',
        enum: ['1:1', '16:9', '4:3', '3:4', '9:16'],
        description: 'Aspect ratio of the image.'
      },
      input_images: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional; One or multiple image IDs to use as reference.'
      }
    },
    required: ['prompt', 'aspect_ratio']
  },
  execute: async ({ prompt, aspect_ratio, input_images }, context) => {
    // 1. Mapeo de input_images (de IDs/URLs a objetos inlineData)
    // Nota: Gemini espera el Base64 puro en el campo 'data'
    const imageParts = (input_images || []).map((b64Data) => ({
      inlineData: {
        mimeType: 'image/png',
        data: b64Data
      }
    }))

    // 2. Enriquecimiento del prompt con el aspect ratio
    const enhancedPrompt = `${prompt} Aspect ratio: ${aspect_ratio}`
    const payload = {
      contents: [
        {
          parts: [{ text: enhancedPrompt }, ...imageParts]
        }
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          imageSize: '2K', // El equivalente a 'size' (Gemini usa 1K, 2K, 4K)
          aspectRatio: aspect_ratio
        }
      }
    }

    console.log(`Calling Gemini Image`)
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${VERTEX_API_KEY}`,
      {
        method: 'POST',
        headers: {
          // Authorization: `Bearer ${VERTEX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Gemini Image API error: ${response.status} ${errorText}`
      )
    }

    const data = await response.json()
    // console.log('Gemini Image response', JSON.stringify(data, null, 2))
    console.log('Gemini Image response received')

    // Extracción siguiendo la estructura: candidates[0].content.parts
    if (data.candidates && data.candidates[0].content.parts) {
      const parts = data.candidates[0].content.parts
      const imagePart = parts.find((p) => p.inlineData)

      // In a full implementation, we would download the image and save it to the canvas
      const { fileUrl } = await saveFile(imagePart.inlineData.data)

      if (imagePart) {
        return `image generated successfully. URL: ${fileUrl}`
      }
    }

    throw new Error('No image data in response')
  }
}
