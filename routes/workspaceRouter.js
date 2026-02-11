import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import mime from 'mime-types';
import { z, validateBody, validateQuery } from '../utils/validation.js';
import { WORKSPACE_ROOT } from '../constants.js';

const router = express.Router();

if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

function safePath(relPath = '') {
  const candidate = path.resolve(WORKSPACE_ROOT, relPath);
  if (!candidate.startsWith(path.resolve(WORKSPACE_ROOT))) {
    throw new Error('Path outside workspace is not allowed');
  }
  return candidate;
}

function getFileType(filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) return 'folder';
  const ext = path.extname(filePath).toLowerCase();
  const image = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.ico']);
  const video = new Set(['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp']);
  const audio = new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a']);
  const document = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages']);
  const archive = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']);
  const code = new Set(['.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs']);
  if (image.has(ext)) return 'image';
  if (video.has(ext)) return 'video';
  if (audio.has(ext)) return 'audio';
  if (document.has(ext)) return 'document';
  if (archive.has(ext)) return 'archive';
  if (code.has(ext)) return 'code';
  return 'file';
}

const pathSchema = z.object({ path: z.string().min(1) });
const renameSchema = z.object({ old_path: z.string().min(1), new_path: z.string().min(1) });
const writeSchema = z.object({ path: z.string().min(1), content: z.string() });
const listQuerySchema = z.object({ rel_path: z.string().optional().default('') });
const browseQuerySchema = z.object({ path: z.string().optional().default('') });
const fullPathQuerySchema = z.object({ path: z.string().min(1) });

router.post('/update_file', validateBody(writeSchema), async (req, res) => {
  try {
    const fullPath = safePath(req.body.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, req.body.content, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/create_file', validateBody(pathSchema), async (req, res) => {
  try {
    const fullPath = safePath(req.body.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, '');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/delete_file', validateBody(pathSchema), async (req, res) => {
  try {
    const fullPath = safePath(req.body.path);
    if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/rename_file', validateBody(renameSchema), async (req, res) => {
  try {
    const oldPath = safePath(req.body.old_path);
    const newPath = safePath(req.body.new_path);
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/read_file', validateBody(pathSchema), async (req, res) => {
  try {
    const fullPath = safePath(req.body.path);
    if (!fs.existsSync(fullPath)) return res.json({ error: `File ${req.body.path} does not exist`, path: req.body.path });
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/list_files_in_dir', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const fullPath = safePath(req.query.rel_path);
    const files = fs.readdirSync(fullPath).map((name) => {
      const p = path.join(fullPath, name);
      const stat = fs.statSync(p);
      return { name, is_dir: stat.isDirectory(), rel_path: path.join(req.query.rel_path, name), mtime: stat.mtimeMs };
    }).sort((a, b) => b.mtime - a.mtime).map(({ mtime, ...rest }) => rest);
    res.json(files);
  } catch {
    res.json([]);
  }
});

router.post('/open_folder_in_explorer', validateBody(pathSchema), async (req, res) => {
  res.json({ success: true, message: 'Folder open request accepted', path: req.body.path });
});

router.get('/browse_filesystem', validateQuery(browseQuerySchema), async (req, res) => {
  try {
    const browsePath = req.query.path || os.homedir();
    if (!fs.existsSync(browsePath) || !fs.statSync(browsePath).isDirectory()) {
      return res.status(404).json({ detail: 'Path not found' });
    }
    const items = fs.readdirSync(browsePath)
      .filter((item) => !item.startsWith('.'))
      .map((item) => {
        const itemPath = path.join(browsePath, item);
        const stat = fs.statSync(itemPath);
        const type = getFileType(itemPath);
        const isDirectory = stat.isDirectory();
        return {
          name: item,
          path: itemPath,
          type,
          size: isDirectory ? null : stat.size,
          mtime: stat.mtimeMs,
          is_directory: isDirectory,
          is_media: type === 'image' || type === 'video',
          has_thumbnail: type === 'image' || type === 'video'
        };
      });
    res.json({ current_path: browsePath, parent_path: path.dirname(browsePath) === browsePath ? null : path.dirname(browsePath), items });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/get_media_files', validateQuery(fullPathQuerySchema), (req, res) => {
  try {
    const dirPath = req.query.path;
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return res.status(400).json({ detail: 'Invalid directory path' });
    }
    const mediaFiles = fs.readdirSync(dirPath)
      .map((name) => path.join(dirPath, name))
      .filter((p) => fs.existsSync(p) && fs.statSync(p).isFile())
      .map((p) => {
        const type = getFileType(p);
        if (type !== 'image' && type !== 'video') return null;
        const stat = fs.statSync(p);
        return { name: path.basename(p), path: p, type, size: stat.size, mtime: stat.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);

    res.json(mediaFiles);
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/get_file_thumbnail', validateQuery(z.object({ file_path: z.string().min(1) })), (req, res) => {
  const filePath = req.query.file_path;
  if (!fs.existsSync(filePath)) return res.status(404).json({ detail: 'File not found' });
  const type = getFileType(filePath);
  res.json({ path: filePath, type, exists: true, can_preview: type === 'image' || type === 'video' });
});

router.get('/serve_file', validateQuery(z.object({ file_path: z.string().min(1) })), (req, res) => {
  const filePath = req.query.file_path;
  if (!fs.existsSync(filePath)) return res.status(404).json({ detail: 'File not found' });
  if (!fs.statSync(filePath).isFile()) return res.status(400).json({ detail: 'Path is not a file' });
  const type = getFileType(filePath);
  if (type !== 'image' && type !== 'video') return res.status(400).json({ detail: 'File type not supported for preview' });

  const mediaType = mime.lookup(filePath) || 'application/octet-stream';
  res.type(mediaType);
  return res.sendFile(path.resolve(filePath));
});

router.get('/get_file_info', validateQuery(z.object({ file_path: z.string().min(1) })), (req, res) => {
  const filePath = req.query.file_path;
  if (!fs.existsSync(filePath)) return res.status(404).json({ detail: 'File not found' });
  const stat = fs.statSync(filePath);
  const type = getFileType(filePath);
  res.json({
    name: path.basename(filePath),
    path: filePath,
    type,
    size: stat.size,
    mtime: stat.mtimeMs,
    ctime: stat.ctimeMs,
    is_directory: stat.isDirectory(),
    is_media: type === 'image' || type === 'video',
    mime_type: mime.lookup(filePath) || 'application/octet-stream'
  });
});

export default router;
