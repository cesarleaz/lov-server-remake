import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function getDirname(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}
