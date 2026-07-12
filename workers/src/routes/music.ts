import { Hono } from 'hono';
import type { Env } from '../types';

const music = new Hono<{ Bindings: Env }>();

// GET /api/music-list
music.get('/music-list', async (c) => {
  return c.json(['/music/waltz-for-debby.mp3']);
});

export { music };
