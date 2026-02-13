import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { FILES_DIR } from '../constants.js'

export async function saveFile(base64Data, mimeType = 'image/png') {
  const extension = mimeType.startsWith('video/') ? 'mp4' : 'png'
  const fileName = `${Date.now()}.${extension}`
  const filePath = path.join(FILES_DIR, fileName)
  
  const buffer = Buffer.from(base64Data, 'base64')
  await fs.writeFile(filePath, buffer)
  
  return { fileUrl: `/api/file/${fileName}`, fileName }
}

export async function saveVideoFile(base64Data) {
  return saveFile(base64Data, 'video/mp4')
}
