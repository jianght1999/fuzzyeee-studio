import { Hono } from 'hono';
import { DB } from '../db';
import { generateToken, validateToken, invalidateToken, hashPassword, verifyPassword, saveTokensToDB } from '../auth';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/login
auth.post('/login', async (c) => {
  const db = new DB(c.env);
  const { password } = await c.req.json<{ password: string }>();

  // 首次登录：生成并存储密码哈希
  const stored = await db.getSetting('password_hash');
  if (!stored) {
    const hash = hashPassword(password);
    await db.setSetting('password_hash', hash);
    const token = generateToken();
    await saveTokensToDB(db);
    return c.json({ success: true, token });
  }

  if (verifyPassword(password, stored)) {
    const token = generateToken();
    await saveTokensToDB(db);
    return c.json({ success: true, token });
  }
  return c.json({ success: false, error: 'wrong password' }, 401);
});

// POST /api/logout
auth.post('/logout', async (c) => {
  const db = new DB(c.env);
  const { token } = await c.req.json<{ token: string }>();
  invalidateToken(token);
  await saveTokensToDB(db);
  return c.json({ success: true });
});

export { auth };
