import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { FILES_DIR } from '../constants.js'

export async function saveFile(base64Data) {
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const imageName = `${Date.now()}.png`
  const imagePath = path.join(FILES_DIR, imageName)
  await fs.writeFile(imagePath, imageBuffer);
  // Retornar url
  return { fileUrl: `/api/file/${imageName}` }
}
