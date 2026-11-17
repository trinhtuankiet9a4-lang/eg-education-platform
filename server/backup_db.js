import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'eg_education.db');
const backupDir = path.resolve(__dirname, '../backups');

function formatLocalTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

function runBackup() {
  if (!fs.existsSync(dbPath)) {
    console.error(`[Backup] ERROR: Database file not found at ${dbPath}`);
    process.exit(1);
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const fileName = `eg_education_${formatLocalTimestamp()}.db`;
  const backupPath = path.join(backupDir, fileName);

  // Use read-only SQLite VACUUM INTO to capture committed WAL state cleanly, with file-copy fallback
  let method = 'sqlite-vacuum-into';
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      db.exec('PRAGMA busy_timeout = 5000;');
      db.prepare('VACUUM INTO ?').run(backupPath);
    } finally {
      db.close();
    }
  } catch {
    method = 'file-copy';
    fs.copyFileSync(dbPath, backupPath);
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`[Backup] ERROR: Failed to create backup file at ${backupPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(backupPath);
  console.log(`[Backup] SQLite backup completed (${method})`);
  console.log(`[Backup] Path: ${backupPath}`);
  console.log(`[Backup] Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
}

runBackup();
