/**
 * SQLite database layer using sql.js (SQLite WASM)
 * Database file persisted to data/seedance.db
 */
import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database singleton
let db: Database | null = null;
const DB_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'seedance.db');

/**
 * Initialize the database, creating tables if they don't exist
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Load sql.js WASM
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better performance
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL NOT NULL DEFAULT 0,
      stage TEXT,
      video_url TEXT,
      duration REAL,
      resolution TEXT,
      aspect_ratio TEXT,
      style TEXT,
      seed INTEGER,
      cfg_scale REAL,
      error_message TEXT,
      engine_task_id TEXT,
      reference_files TEXT DEFAULT '[]',
      model TEXT,
      mode TEXT,
      last_frame_file TEXT,
      reference_files_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT
    );
  `);

  // Migrate: add new columns to existing tables
  const migrations = [
    'ALTER TABLE tasks ADD COLUMN model TEXT',
    'ALTER TABLE tasks ADD COLUMN mode TEXT',
    'ALTER TABLE tasks ADD COLUMN last_frame_file TEXT',
    "ALTER TABLE tasks ADD COLUMN reference_files_json TEXT DEFAULT '{}'",
    "ALTER TABLE api_config ADD COLUMN model_endpoints_json TEXT DEFAULT '{}'",
    'ALTER TABLE tasks ADD COLUMN user_id TEXT',
  ];
  for (const sql of migrations) {
    try { db.run(sql); } catch { /* column already exists */ }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS api_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      api_key TEXT,
      access_key_id TEXT,
      secret_access_key TEXT,
      endpoint TEXT DEFAULT 'https://visual.volcengineapi.com',
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Insert default config if not exists
  const configRows = db.exec("SELECT COUNT(*) as cnt FROM api_config WHERE id = 'default'");
  const count = configRows[0]?.values[0]?.[0] as number || 0;
  if (count === 0) {
    db.run(`
      INSERT INTO api_config (id, endpoint, updated_at)
      VALUES ('default', 'https://visual.volcengineapi.com', datetime('now', 'localtime'))
    `);
  }

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Initialize default admin user (admin / admin123)
  const adminRows = db.exec("SELECT COUNT(*) as cnt FROM users WHERE username = 'admin'");
  const adminCount = adminRows[0]?.values[0]?.[0] as number || 0;
  if (adminCount === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const adminId = uuidv4();
    db.run(
      `INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
       VALUES (?, 'admin', ?, 'admin', datetime('now', 'localtime'), datetime('now', 'localtime'))`,
      [adminId, adminHash]
    );
    console.log('Default admin user created: admin / admin123');
  }

  persistDatabase();
  console.log(`Database initialized at: ${DB_PATH}`);
  return db;
}

/**
 * Get the database instance (must call initDatabase first)
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Persist the in-memory database to disk
 */
export function persistDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('Failed to persist database:', error);
  }
}

/**
 * Close the database and persist to disk
 */
export function closeDatabase(): void {
  if (!db) return;
  try {
    persistDatabase();
    db.close();
    db = null;
    console.log('Database closed and persisted.');
  } catch (error) {
    console.error('Failed to close database:', error);
  }
}

/**
 * Helper: run a query and persist
 */
export function runQuery(sql: string, params: unknown[] = []): void {
  const database = getDatabase();
  database.run(sql, params);
  persistDatabase();
}

/**
 * Helper: get single row
 */
export function getOne<T>(sql: string, params: unknown[] = []): T | null {
  const database = getDatabase();
  const result = database.exec(sql, params);
  if (!result[0] || !result[0].values[0]) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const obj: Record<string, unknown> = {};
  columns.forEach((col, idx) => {
    obj[col] = values[idx];
  });
  return obj as T;
}

/**
 * Helper: get multiple rows
 */
export function getAll<T>(sql: string, params: unknown[] = []): T[] {
  const database = getDatabase();
  const result = database.exec(sql, params);
  if (!result[0]) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}
