import { hashSync, compareSync } from 'bcryptjs';

// 内存 token 存储（Worker 冷启动时重置，个人博客够用）
const tokens = new Set<string>();

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
