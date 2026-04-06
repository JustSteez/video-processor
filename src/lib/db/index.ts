import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const dbDir = path.join(process.cwd(), 'storage')
fs.mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(path.join(dbDir, 'app.db'))

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'queued',
    target_duration REAL NOT NULL,
    output_path TEXT,
    error_message TEXT,
    progress INTEGER DEFAULT 0,
    progress_phase TEXT DEFAULT 'queued',
    created_at INTEGER,
    completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id),
    path TEXT NOT NULL,
    filename TEXT NOT NULL,
    duration REAL NOT NULL,
    size INTEGER NOT NULL
  );
`)

export const db = drizzle(sqlite, { schema })
