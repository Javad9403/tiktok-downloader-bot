export function createTables(db: import('better-sqlite3').Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      is_banned INTEGER DEFAULT 0,
      banned_at DATETIME,
      daily_downloads INTEGER DEFAULT 0,
      daily_reset_at DATE,
      total_downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      platform TEXT DEFAULT 'tiktok',
      status TEXT DEFAULT 'pending',
      file_size INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
    CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
    CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);
    CREATE INDEX IF NOT EXISTS idx_downloads_platform ON downloads(platform);

    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add platform column and rename tiktok_url to url if needed
  const columns = db.prepare("PRAGMA table_info(downloads)").all() as { name: string }[];
  const hasPlatform = columns.some(c => c.name === 'platform');
  const hasTiktokUrl = columns.some(c => c.name === 'tiktok_url');

  if (!hasPlatform) {
    db.exec("ALTER TABLE downloads ADD COLUMN platform TEXT DEFAULT 'tiktok'");
  }
  if (hasTiktokUrl && !columns.some(c => c.name === 'url')) {
    db.exec("ALTER TABLE downloads RENAME COLUMN tiktok_url TO url");
  }
}