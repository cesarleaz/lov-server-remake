import { VERTEX_API_KEY } from '../constants.js'
import { saveVideoFile } from '../lib/r2.js'
import { saveVideoToCanvas } from '../utils/videoCanvasUtils.js'
import { fetchWithTimeout } from '../utils/httpUtils.js'

const VIDEO_MODELS = [
  'veo-3.0-generate-001',
  'veo-2.0-generate-001'
]

const MAX_RETRIES = 3
const POLL_INTERVAL = 5000
const MAX_POLL_ATTEMPTS = 120

async function callVeoAPI(prompt, model) {
  const payload = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1 }
  }

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${VERTEX_API_KEY.split(':')[0]}/locations/us-central1/publishers/google/models/${model}:predictLongRunning`

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VERTEX_API_KEY}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw { message: `Veo API error: ${response.status} ${errorText}`, retryable: response.status === 503 }
  }

  return response.json()
}

async function pollOperation(operationName) {
  const url = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERTEX_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`Poll error: ${response.status}`)
    }

    const data = await response.json()

    if (data.done) {
      if (data.error) {
        throw new Error(`Operation failed: ${data.error.message}`)
      }
      return data.result
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }

  throw new Error('Video generation timed out')
}

export const generateVideo = {
  name: 'generate_video',
  display_name: 'Veo Video',
  type: 'video',
  provider: 'google',
  description: 'Generate a video from a text prompt using Google Veo AI.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt for video generation.'
      },
      aspect_ratio: {
        type: 'string',
        enum: ['16:9', '9:16'],
        description: 'Aspect ratio of the video.'
      }
    },
    required: ['prompt']
  },
  execute: async ({ prompt, aspect_ratio }, context) => {
    let lastError = null

    for (const model of VIDEO_MODELS) {
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          console.log(`Calling Veo API (attempt ${retry + 1}): ${model}`)

          const operation = await callVeoAPI(prompt, model)
          
          if (!operation.name) {
            throw new Error('No operation name returned')
          }

          console.log('Polling for result...')
          const result = await pollOperation(operation.name)

          if (!result || !result.steps) {
            throw new Error('No video data in result')
          }

          const videoData = result.steps[0].output.video.uri
          const base64Video = await downloadVideoAsBase64(videoData)

          const { fileUrl, fileName } = await saveVideoFile(base64Video)

          const { element, file, videoUrl: canvasVideoUrl } = await saveVideoToCanvas(
            context.canvas_id,
            fileName,
            640,
            360
          )

          return {
            videoUrl: canvasVideoUrl,
            element,
            file
          }

        } catch (error) {
          lastError = error
          const isRetryable = error.retryable || (error.message && error.message.includes('503'))

          if (!isRetryable) {
            throw error
          }

          console.log(`Veo ${model} error: ${error.message}, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 3000 * (retry + 1)))
        }
      }
    }

    throw new Error(`Video generation failed: ${lastError?.message}`)
  }
}

async function downloadVideoAsBase64(gcsUri) {
  const response = await fetchWithTimeout(gcsUri, {
    method: 'GET'
  })

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}
