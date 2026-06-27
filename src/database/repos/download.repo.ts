import { getDatabase } from '../index';

export interface Download {
  id: number;
  user_id: number;
  tiktok_url: string;
  status: 'pending' | 'success' | 'failed';
  file_size: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function createDownload(userId: number, tiktokUrl: string): Download {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO downloads (user_id, tiktok_url, status) VALUES (?, ?, ?)').run(userId, tiktokUrl, 'pending');
  return db.prepare('SELECT * FROM downloads WHERE id = ?').get(result.lastInsertRowid) as Download;
}

export function completeDownload(downloadId: number, fileSize?: number): void {
  getDatabase().prepare('UPDATE downloads SET status = ?, file_size = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('success', fileSize || null, downloadId);
}

export function failDownload(downloadId: number, errorMessage: string): void {
  getDatabase().prepare('UPDATE downloads SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('failed', errorMessage, downloadId);
}

export function getTotalDownloads(): number {
  const result = getDatabase().prepare('SELECT COUNT(*) as count FROM downloads').get() as { count: number };
  return result.count;
}

export function getSuccessfulDownloads(): number {
  const result = getDatabase().prepare("SELECT COUNT(*) as count FROM downloads WHERE status = 'success'").get() as { count: number };
  return result.count;
}

export function getFailedDownloads(): number {
  const result = getDatabase().prepare("SELECT COUNT(*) as count FROM downloads WHERE status = 'failed'").get() as { count: number };
  return result.count;
}

export function getDownloadsToday(): number {
  const result = getDatabase().prepare("SELECT COUNT(*) as count FROM downloads WHERE created_at >= date('now')").get() as { count: number };
  return result.count;
}

export function getDownloadsByUser(userId: number): { total: number; successful: number; failed: number } {
  const db = getDatabase();
  const total = (db.prepare('SELECT COUNT(*) as count FROM downloads WHERE user_id = ?').get(userId) as { count: number }).count;
  const successful = (db.prepare("SELECT COUNT(*) as count FROM downloads WHERE user_id = ? AND status = 'success'").get(userId) as { count: number }).count;
  const failed = (db.prepare("SELECT COUNT(*) as count FROM downloads WHERE user_id = ? AND status = 'failed'").get(userId) as { count: number }).count;
  return { total, successful, failed };
}

export function getTotalStorageUsed(): number {
  const result = getDatabase().prepare("SELECT COALESCE(SUM(file_size), 0) as total FROM downloads WHERE status = 'success'").get() as { total: number };
  return result.total;
}