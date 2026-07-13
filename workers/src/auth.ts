import { hashSync, compareSync } from 'bcryptjs';
import type { DB } from './db';

// 内存 token 存储（热缓存，冷启动后从 DB 恢复）
const tokens = new Set<string>();
let tokensLoaded = false;

export function generateToken(): string {
  const t = 'pixel_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  tokens.add(t);
  return t;
}

export function validateToken(t: string): boolean {
  return tokens.has(t);
}

export function invalidateToken(t: string): void {
  tokens.delete(t);
}

export function hashPassword(pw: string): string {
  return hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return compareSync(pw, hash);
}

/** 冷启动后从 DB 恢复 token */
export async function ensureTokensLoaded(db: DB): Promise<void> {
  if (tokensLoaded) return;
  try {
    const raw = await db.getSetting('active_tokens');
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      arr.forEach(t => tokens.add(t));
    }
  } catch { /* ignore parse errors */ }
  tokensLoaded = true;
}

/** 将当前 token 集合持久化到 DB */
export async function saveTokensToDB(db: DB): Promise<void> {
  await db.setSetting('active_tokens', JSON.stringify([...tokens]));
}
