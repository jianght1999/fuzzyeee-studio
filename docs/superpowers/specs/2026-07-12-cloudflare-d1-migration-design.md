# Pixel Notes → Cloudflare Workers + D1 动态博客改造设计

## 目标

将 pixel-notes 从纯静态博客（构建时 import.meta.glob 打包内容）改造为动态博客，部署到 Cloudflare Pages + Workers + D1，实现：
- 所有本地 dev 功能在线上可用（登录、编辑、保存、创建、删除、重命名、移动、排序）
- 93 篇现有笔记完整迁移，一字不丢
- 在线编辑后即时生效，无需重新构建部署

## 架构

```
                     fuzzyeeestudio.cn
                    ┌─────────────────────┐
                    │  Cloudflare Pages    │
                    │  React SPA (dist/)   │
                    └───────┬─────────────┘
                            │ fetch /api/*
                            ▼
                    ┌─────────────────────┐
                    │  Cloudflare Workers  │
                    │  /api/* 路由处理      │
                    └───────┬─────────────┘
                            │ D1 client
                            ▼
                    ┌─────────────────────┐
                    │  Cloudflare D1       │
                    │  notes / settings    │
                    │  recent_files        │
                    └─────────────────────┘
```

- **Pages** 托管前端静态资源（index.html, JS, CSS, fonts, images, music）
- **Workers** 处理所有 `/api/*` 请求，提供 CRUD + 鉴权
- **D1** 持久化笔记内容、配置、最近文件记录

## D1 数据库表

### notes

| 列 | 类型 | 说明 |
|---|---|---|
| slug | TEXT PRIMARY KEY | 如 `guitar/Comping/drop 2` |
| category | TEXT NOT NULL | guitar / synth / reading |
| title | TEXT NOT NULL | 从 h1 提取 |
| content | TEXT NOT NULL | 完整 HTML |
| parent_slug | TEXT | 父 slug，null = 根级页面 |
| sort_order | INTEGER | 同目录排序位 |
| updated_at | INTEGER | Unix 毫秒时间戳 |

### settings

| 列 | 类型 | 说明 |
|---|---|---|
| key | TEXT PRIMARY KEY | 如 `password_hash` |
| value | TEXT | 如 bcrypt hash |

### recent_files

| 列 | 类型 | 说明 |
|---|---|---|
| path | TEXT PRIMARY KEY | 文件路径 |
| title | TEXT | 标题 |
| category | TEXT | 分类 |
| time | INTEGER | Unix 毫秒时间戳 |

保留原有 `.order.json` 机制 —— 排序通过 notes 表的 `sort_order` 列实现。

## Workers API

所有端点均需 `Content-Type: application/json`。认证通过 `token` 字段（body 中传递）。

### 公开接口

```
GET  /api/pages/:category
  → { pages: [{ slug, title, parentSlug, hasChildren, sortOrder }] }

GET  /api/pages/:category/:slug
  → { slug, title, content, parentSlug, updatedAt }

GET  /api/music-list
  → ["/music/waltz-for-debby.mp3", ...]   （仍从 public/music/ 静态获取）
```

### 认证接口

```
POST /api/login
  body: { password }
  → { success, token? }   token 存 D1 sessions 表

POST /api/logout
  body: { token }
  → { success }
```

### 编辑接口（需 token）

```
POST /api/save
  body: { token, path, content }
  → { success }

POST /api/create-page
  body: { token, path, content? }
  → { success }

POST /api/delete-page
  body: { token, path }
  → { success }

POST /api/rename-page
  body: { token, oldPath, newPath }
  → { success }   同时在 D1 更新 slug 及所有子页面的 parent_slug

POST /api/move-page
  body: { token, oldPath, newPath }
  → { success }   更新 slug, parent_slug, category

GET  /api/recent
  → [...]   最近编辑列表

POST /api/recent-delete
  body: { token, path }
  → { success }
```

### 密码管理

首次部署时，Worker 检查 D1 settings 表中是否有 `password_hash`：
- 无 → 生成随机密码，bcrypt 哈希后存入 D1，**密码仅在此次 Worker 日志中输出**（部署者需要查看日志获取）
- 有 → 正常读取校验

### Token 机制

复用现有的生成逻辑：`pixel_<random><timestamp>`，存 Worker 内存 `Set`，浏览器存 sessionStorage。Worker 不持久化 sessions（内存即可，重启后重新登录）。

## 前端改动

### 数据加载

**之前：** `useMarkdownPages.ts` 使用 `import.meta.glob` 构建时打包

**之后：**
- 列表页：`GET /api/pages/:category` 返回该分类下所有页面
- 内容页：`GET /api/pages/:category/:slug` 返回单篇 HTML
- 所有 API 调用通过 `fetch()`，BASE_URL 路由到 Workers（同域 `/api/*`）

### 不变的部分

- 所有 React 组件（Navbar, Sidebar, HtmlRenderer, RichTextEditor, MusicPlayer 等）
- CSS Module 样式系统
- 像素主题、自定义光标、字体
- `BrowserRouter basename="/"`

### 需要修改的文件

- `src/hooks/useMarkdownPages.ts` → 改为 `fetch` API 加载
- `src/components/RecentDropdown/RecentDropdown.tsx` → 改为 API 获取
- `src/contexts/AuthContext.tsx` → 已有，无需改动
- `src/data/categories.ts` → 去掉 `import.meta.env.BASE_URL` 前缀（静态图片仍可用）

## 数据迁移

### 迁移脚本

独立的 Node.js 脚本 `scripts/migrate-to-d1.mjs`，在本地运行：

1. 遍历 `src/content/` 全部 93 个 `.html` 文件
2. 解析路径提取 category / slug / parentSlug
3. 提取 `<h1>` 内容作为 title
4. 读取 `.order.json` 确定 sort_order
5. 生成 INSERT 语句，写入 D1（通过 Wrangler CLI 或直接 HTTP API）
6. 记录迁移结果和失败项

### 迁移数据量

| 分类 | slug | 笔记数 | .order.json |
|------|------|--------|-------------|
| guitar | guitar | 29 | 7 |
| synth | synth | 63 | 6 |
| reading | reading | 1 | 0 |
| **合计** | | **93** | **13** |

## 部署结构

```
pixel-notes/
├── dist/                → 部署到 Cloudflare Pages（静态资源）
├── workers/             → 部署到 Cloudflare Workers
│   ├── src/
│   │   └── index.ts     → Worker 主文件（API 路由）
│   ├── package.json
│   └── wrangler.toml    → D1 binding 配置
├── scripts/
│   └── migrate-to-d1.mjs → 一次性数据迁移
├── public/               → 静态资源（字体、图片、光标、音乐）
├── src/                  → React 前端代码
│   └── content/          → [迁移后可作为备份保留或移除]
└── package.json
```

### Cloudflare 资源配置

- **Pages**：绑定到 GitHub 仓库，自动构建 `npm run build`，输出 `dist/`
- **Workers**：独立部署 `workers/` 目录，绑定 D1 database
- **D1**：创建 `pixel-notes-db` 数据库，Worker 通过 binding 访问

## 边界与限制

- 编辑功能仅限登录用户使用，他人浏览无需登录
- Worker 冷启动延迟通常 < 50ms（全球边缘节点），对读写体验影响微小
- D1 免费额度：5GB 存储、50 亿行读/月、1 亿行写/月 — 个人博客完全够用
- 图片上传（ImageUploadModal）在线上依赖 Worker 接收文件 → 需要额外处理 multipart 或改用 R2。本期暂不实现，编辑器中图片使用外部链接
- 音乐播放器列表仍从静态文件获取，不存入 D1
