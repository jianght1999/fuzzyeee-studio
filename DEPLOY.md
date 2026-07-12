# 部署指南

## 前置条件

1. Cloudflare 账号
2. 域名 `fuzzyeeestudio.cn` 的 DNS 已托管到 Cloudflare
3. 本地安装 Node.js 20+

## 第一步：创建 D1 数据库

```bash
cd workers
npx wrangler d1 create pixel-notes-db
```

将输出的 `database_id` 填入 `workers/wrangler.toml` 的 `database_id` 字段。

## 第二步：导入数据

```bash
cd workers
npx wrangler d1 execute pixel-notes-db --remote --file=../migration.sql
```

验证：

```bash
npx wrangler d1 execute pixel-notes-db --remote --command="SELECT count(*) FROM notes"
```

预期输出：101

## 第三步：部署 Worker API

```bash
cd workers
npx wrangler deploy
```

## 第四步：绑定 Worker 路由

在 Cloudflare Dashboard → Workers & Pages → pixel-notes-api → Settings → Triggers → Routes：
添加路由：`fuzzyeeestudio.cn/api/*`

## 第五步：部署前端

```bash
npm run build
npx wrangler pages deploy dist --project-name=fuzzyeee-studio
```

或者通过 Git 集成自动部署（在 Cloudflare Dashboard 中连接 GitHub 仓库，设置 build command 为 `npm run build`，output directory 为 `dist`）。

## 第六步：首次登录设置密码

访问 `fuzzyeeestudio.cn`，点击 "login"，输入你想要的密码。
**注意：首次登录的密码会被设为永久密码。** 后续登录需使用相同密码。

## 本地开发

```bash
npm run dev                   # 启动前端开发服务器（Vite 插件处理 API）
npm run build                 # 构建前端
cd workers && npm run dev    # 启动 Worker 本地开发服务器
```
