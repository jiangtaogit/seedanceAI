/**
 * File Management Service
 * Handles file upload/delete operations
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Track uploaded files metadata
interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

// In-memory file registry (for simple file tracking)
const fileRegistry: Map<string, UploadedFile> = new Map();

/**
 * Ensure uploads directory exists
 */
export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Get uploads directory path
 */
export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

/**
 * Save an uploaded file
 */
export function saveFile(file: {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}): UploadedFile {
  ensureUploadsDir();

  const fileId = uuidv4();
  const ext = path.extname(file.originalname) || getExtensionFromMime(file.mimetype);
  const filename = `${fileId}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);

  const uploadedFile: UploadedFile = {
    id: fileId,
    originalName: file.originalname,
    filename,
    path: filePath,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date().toISOString(),
  };

  fileRegistry.set(fileId, uploadedFile);
  return uploadedFile;
}

/**
 * Delete a file by its ID
 */
export function deleteFile(fileId: string): boolean {
  const fileInfo = fileRegistry.get(fileId);
  if (!fileInfo) return false;

  try {
    if (fs.existsSync(fileInfo.path)) {
      fs.unlinkSync(fileInfo.path);
    }
    fileRegistry.delete(fileId);
    return true;
  } catch (error) {
    console.error(`Failed to delete file ${fileId}:`, error);
    return false;
  }
}

/**
 * Get file info by ID
 */
export function getFileInfo(fileId: string): UploadedFile | null {
  return fileRegistry.get(fileId) || null;
}

/**
 * Get extension from MIME type
 */
function getExtensionFromMime(mimetype: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
  };
  return mimeMap[mimetype] || '';
}
