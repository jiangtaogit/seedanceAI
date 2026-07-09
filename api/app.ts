/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import configRoutes from './routes/config.js'
import uploadRoutes from './routes/upload.js'
import { initDatabase, closeDatabase } from './database.js'
import { ensureUploadsDir, getUploadsDir } from './services/file.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

// ============ Middleware ============

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ============ Static Files ============

// Serve uploaded files from uploads directory
ensureUploadsDir()
const uploadsPath = getUploadsDir()
app.use('/uploads', express.static(uploadsPath))

// Serve built frontend (production mode — only if dist exists)
const distPath = path.join(__dirname, '..', 'dist')
const hasDist = existsSync(distPath)
if (hasDist) {
  app.use(express.static(distPath))
}

// ============ API Routes ============

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/config', configRoutes)
app.use('/api/upload', uploadRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * Initialize database on server startup
 */
app.set('dbReady', false)
initDatabase()
  .then(() => {
    app.set('dbReady', true)
    console.log('Database initialized successfully')
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err)
  })

// ============ Error Handlers ============

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)

  // Handle multer file size errors
  if (error?.message?.includes('File too large') || error?.message?.includes('LIMIT_FILE_SIZE')) {
    res.status(413).json({
      success: false,
      error: 'File size exceeds limit',
    })
    return
  }

  // Handle multer file type errors
  if (error?.message?.includes('File type not allowed')) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
    return
  }

  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler - SPA fallback: return index.html for non-API routes
 */
app.use((req: Request, res: Response) => {
  // API routes that didn't match → 404 JSON
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API not found',
    });
    return;
  }
  // All other routes → SPA fallback to index.html (if dist exists)
  if (hasDist && existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
    return;
  }
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// ============ Graceful Shutdown ============

process.on('SIGTERM', () => {
  closeDatabase()
})

process.on('SIGINT', () => {
  closeDatabase()
})

export default app
