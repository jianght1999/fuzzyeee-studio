import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './routes/auth';
import { pages } from './routes/pages';
import { recent } from './routes/recent';
import { music } from './routes/music';
import { images } from './routes/images';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS 中间件
app.use('*', cors());

// 挂载路由
app.route('/api', auth);
app.route('/api', pages);
app.route('/api', recent);
app.route('/api', music);
app.route('/api', images);

// GET /api/health
app.get('/api/health', (c) => {
  return c.json({ ok: true, db: 'tidb' });
});

export default app;
