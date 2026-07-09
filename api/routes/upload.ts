/**
 * Upload Routes
 * POST /api/upload - Upload file (using multer)
 * DELETE /api/upload/:fileId - Delete uploaded file
 */
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { saveFile, deleteFile, getFileInfo, getUploadsDir, ensureUploadsDir } from '../services/file.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

// ============ Multer Configuration ============

// Allowed MIME types
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.mp3', '.wav', '.m4a', '.aac', '.ogg'];

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    // Check MIME type
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    // Check extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
      return;
    }

    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
  },
});

/**
 * Upload a file
 * POST /api/upload
 */
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const savedFile = saveFile({
      originalname: req.file.originalname,
      buffer: req.file.buffer,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.status(201).json({
      success: true,
      data: {
        id: savedFile.id,
        originalName: savedFile.originalName,
        filename: savedFile.filename,
        size: savedFile.size,
        mimetype: savedFile.mimetype,
        uploadedAt: savedFile.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Handle multer errors
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: 'File size exceeds 20MB limit' });
      return;
    }

    res.status(500).json({ success: false, error: error?.message || 'Failed to upload file' });
  }
});

/**
 * Delete an uploaded file
 * DELETE /api/upload/:fileId
 */
router.delete('/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const deleted = deleteFile(fileId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.json({ success: true, message: 'File deleted' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete file' });
  }
});

export default router;
