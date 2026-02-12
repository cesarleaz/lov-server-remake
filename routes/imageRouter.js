import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { FILES_DIR } from '../services/configService.js';
import { z, validateParams } from '../utils/validation.js';
import { PORT } from '../constants.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

const fileParamSchema = z.object({ file_id: z.string().min(1) });

function getImageDimensions(buffer) {
  // PNG
  if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  // GIF
  if (buffer.length > 10 && (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  // JPEG
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length) {
      if (buffer[i] !== 0xff) break;
      const marker = buffer[i + 1];
      const length = buffer.readUInt16BE(i + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
      }
      i += 2 + length;
    }
  }
  return { width: null, height: null };
}

router.post('/upload_image', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'Missing file field' });
  }

  const ext = path.extname(req.file.originalname || '').replace('.', '').toLowerCase() || 'jpg';
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
  const fileId = `${nanoid()}.${normalizedExt}`;
  const filePath = path.join(FILES_DIR, fileId);

  fs.writeFileSync(filePath, req.file.buffer);
  const { width, height } = getImageDimensions(req.file.buffer);

  return res.json({
    file_id: fileId,
    url: `http://localhost:${PORT}/api/file/${fileId}`,
    width,
    height
  });
});

router.get('/file/:file_id', validateParams(fileParamSchema), async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.file_id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ detail: 'File not found' });
  }
  return res.sendFile(path.resolve(filePath));
});

export default router;
