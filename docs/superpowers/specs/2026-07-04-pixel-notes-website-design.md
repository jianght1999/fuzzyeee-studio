# 像素风格个人学习笔记网站 — 设计文档

> **日期**：2026-07-04
> **状态**：设计完成，待用户审阅

---

## 一、项目概述

一个像素风格的 React SPA 个人学习笔记网站。主页以像素展柜网格形式展示各笔记领域的入口卡片，点击进入后左侧目录 + 右侧正文。笔记内容为 Markdown 渲染，可嵌入特殊组件（如吉他指板图）。图片由用户手绘，具备可延展性以容纳未来新增的笔记领域。

### 核心目标

1. 像素风格贯穿全站，视觉统一
2. 主页简洁直观，领域入口一目了然
3. 笔记内容易于撰写和扩展
4. 吉他指板等专业可视化组件的展示
5. 新增笔记领域零摩擦

---

## 二、技术选型

| 项目 | 选择 |
|------|------|
| 框架 | React (SPA) |
| 构建工具 | Vite |
| 路由 | React Router |
| Markdown 渲染 | react-markdown + remark 插件 |
| 样式方案 | CSS Modules 或 Tailwind CSS（搭配像素风自定义主题） |
| 字体 | zpix（中文像素体）、Press Start 2P / Silkscreen（英文） |
| 部署 | 待定（GitHub Pages / Vercel 等） |
| 图片 | 用户手绘 PNG，尺寸 32×32 到 128×128px |

---

## 三、页面结构 & 路由

```
/                      →  首页（像素展柜网格）
/notes/:category       →  笔记内容页（左目录 + 右正文）
/about                 →  关于页（可选，后续）
```

### 3.1 首页 `/`

```
┌──────────────────────────────────────┐
│         🏠 像素风导航栏               │
│   [首页]  [关于]        [像素小人]    │
├──────────────────────────────────────┤
│                                      │
│   ┌──────────┐  ┌──────────┐        │
│   │  像素插画  │  │  像素插画  │        │
│   │          │  │          │        │
│   │ 爵士吉他  │  │ 合成器   │        │
│   │  3篇笔记  │  │  敬请期待  │        │
│   └──────────┘  └──────────┘        │
│                                      │
│   ┌──────────┐  ┌──────────┐        │
│   │  像素插画  │  │  像素插画  │        │
│   │          │  │          │        │
│   │ 读书笔记  │  │ 敬请期待  │        │
│   │  敬请期待  │  │          │        │
│   └──────────┘  └──────────┘        │
│                                      │
│         像素风页脚                   │
└──────────────────────────────────────┘
```

**卡片行为：**
- 2×N 自适应网格布局，卡片正方形（最小 200×200px）
- 每个卡片：手绘像素插画（居中）+ 领域标题 + 笔记数量或描述
- 悬停效果：卡片放大 5px + 边框颜色切换 + `image-rendering: pixelated`
- 点击后触发像素风转场动画（黑格逐块消失），然后路由跳转
- "敬请期待"的空白卡片：虚线像素边框、半透明、不可点击
- 新增领域：在数据配置文件中新增一条记录即可，卡片自动生成

### 3.2 笔记内容页 `/notes/:category`

```
┌──────────────────────────────────────┐
│  ← 返回首页    🎸 爵士吉他          │
├────────┬─────────────────────────────┤
│        │                             │
│ 📑目录  │    ┌──────────────────┐    │
│        │    │  正文内容区域      │    │
│ CAGED  │    │                  │    │
│ 系统   │    │  ## CAGED 系统   │    │
│        │    │                  │    │
│ 琶音   │    │  CAGED是吉他指板  │    │
│        │    │  的五种基本指形.. │    │
│ 音阶   │    │                  │    │
│        │    │  <Fretboard       │    │
│ 和弦   │    │   caged="C"       │    │
│        │    │   showNotes />    │    │
│ ...    │    │                  │    │
│        │    │  ...             │    │
│        │    └──────────────────┘    │
└────────┴─────────────────────────────┘
```

**布局细节：**
- 左侧目录栏宽度固定（约 220px），右侧正文自适应
- 目录支持多级缩进和折叠分组
- 当前所在章节高亮（像素边框左侧高亮条）
- 移动端（< 768px）：目录收起到顶部汉堡菜单
- 正文使用像素字体渲染 Markdown
- 正文中可嵌入特殊组件（`<Fretboard />` 等）

### 3.3 可扩展性设计

新增一个笔记领域的步骤：

1. 在 `src/data/categories.ts` 中添加一条记录（名称、图标路径、描述、slug）
2. 在 `src/content/<slug>/` 下放置 `.md` 文件
3. 手绘该领域的像素插画放到 `public/images/<slug>.png`

无需修改任何组件代码。

---

## 四、核心组件

### 4.1 组件树

```
App
├── PixelNavbar          — 顶部导航栏（像素字体 + 硬边边框）
├── Routes
│   ├── HomePage
│   │   ├── CategoryGrid      — 自适应网格容器
│   │   │   └── CategoryCard  — 单个领域入口卡片（×N）
│   │   └── PixelFooter       — 页脚
│   │
│   └── NotePage
│       ├── Sidebar           — 左侧目录
│       │   ├── SidebarItem   — 目录项（支持嵌套）
│       │   └── MobileMenu    — 移动端汉堡菜单
│       └── ContentArea       — 右侧正文
│           ├── MarkdownRenderer  — Markdown → HTML
│           └── CustomComponents  — 特殊内嵌组件注册表
│               └── Fretboard     — 吉他指板组件
│
└── PixelTransition       — 像素转场动画
```

### 4.2 CategoryCard 组件

```typescript
interface CategoryCardProps {
  title: string;          // 领域名称，如 "爵士吉他"
  description: string;    // 简短描述或笔记数量
  image: string;          // 手绘像素插画路径
  slug: string;           // 路由 slug
  isAvailable: boolean;   // 是否有内容（false 时显示"敬请期待"）
}
```

**交互状态：**
| 状态 | 表现 |
|------|------|
| 默认 | 像素边框 + 插画 + 标题 |
| 悬停 | 放大 5px + 边框色变为高亮色 + `box-shadow: 6px 6px 0 #highlight` |
| 点击 | 触发 PixelTransition 转场动画 |
| 禁用 | 虚线边框 + 透明度 0.5 + `cursor: not-allowed` |

### 4.3 Sidebar 组件

- 从 Markdown 的 `##` / `###` 标题自动生成目录结构
- 当前活跃项左侧有像素风格指示条（闪烁或高亮块）
- 支持折叠/展开分组
- 点击目录项平滑滚动到对应正文位置（`scrollIntoView`）

### 4.4 MarkdownRenderer 组件

- 基于 `react-markdown`
- 自定义像素风渲染器：标题、代码块、引用块、图片等
- 支持自定义组件注入：Markdown 中写 `<Fretboard caged="C" />` 会被解析为对应 React 组件
- 代码块使用像素风边框 + 等宽像素字体

### 4.5 Fretboard 吉他指板组件 ⭐

```
┌──────────────────────────────────────┐
│  CAGED 指形选择器                     │
│  [C] [A] [G] [E] [D]                │
│       (像素按钮，选中态高亮)           │
├──────────────────────────────────────┤
│                                      │
│     1品  2品  3品  4品  5品  6品...  │
│  1  ├───┼───┼───┼───┼───┼───┤      │
│  2  ├───┼───┼───┼───┼───┼───┤      │
│  3  ├───┼───┼───┼───┼───┼───┤      │
│  4  ├───┼───┼───┼───┼───┼───┤      │
│  5  ├───┼───┼───┼───┼───┼───┤      │
│  6  ├───┼───┼───┼───┼───┼───┤      │
│        ○   ●   ○   ●   ○   ○        │
│                                      │
│  C指形以中指为根音，覆盖...（说明文）   │
└──────────────────────────────────────┘
```

```typescript
interface FretboardProps {
  caged: 'C' | 'A' | 'G' | 'E' | 'D';  // 当前指形
  showNotes?: boolean;                   // 是否显示音名标注
  startFret?: number;                    // 起始品格（默认 1）
  endFret?: number;                      // 结束品格（默认 6）
  caption?: string;                      // 下方说明文字
}
```

- 指板由纯 CSS/Canvas 绘制，像素风格品格线
- 开放弦 = 空心圈 `○`，按弦 = 实心圆 `●`
- CAGED 数据：每种指形的按弦位置硬编码在配置文件中
- 后续可替换为用户手绘的指板 PNG 图片
- 品格范围可通过 `startFret` / `endFret` 调节

### 4.6 PixelTransition 组件

页面切换时的像素风转场动画：
- 屏幕被 N×M 个黑色像素方块逐块覆盖（从边缘到中心或随机）
- 新页面加载后像素方块逐块展开
- 动画时长约 300-400ms
- 使用 CSS `clip-path` 或 Canvas 实现

---

## 五、数据流

```
src/
├── data/
│   └── categories.ts        — 笔记领域配置（名称、slug、插画路径、描述）
└── content/
    ├── guitar/
    │   ├── caged-system.md   — CAGED系统笔记
    │   ├── arpeggios.md      — 琶音笔记
    │   └── scales.md         — 音阶笔记
    ├── synth/
    │   └── oscillator.md     — 合成器笔记（示例）
    └── reading/
        └── book-1.md         — 读书笔记（示例）
```

**categories.ts 配置结构：**
```typescript
export interface Category {
  slug: string;
  title: string;
  description: string;
  image: string;         // /images/<slug>.png
  isAvailable: boolean;
}

export const categories: Category[] = [
  { slug: 'guitar', title: '爵士吉他', description: '3篇笔记', image: '/images/guitar.png', isAvailable: true },
  { slug: 'synth', title: '合成器制作', description: '敬请期待', image: '/images/synth.png', isAvailable: false },
  { slug: 'reading', title: '读书笔记', description: '敬请期待', image: '/images/reading.png', isAvailable: false },
];
```

**笔记内容加载流程：**
1. 路由匹配 `:category` → 查 `categories.ts` 获取领域信息
2. 动态 `import()` 加载对应 `content/<category>/` 下的 `.md` 文件
3. Sidebar 解析 Markdown 标题生成目录
4. MarkdownRenderer 渲染正文，注入自定义组件

---

## 六、像素风设计系统

### 6.1 配色

采用经典 16 色调色板风格（NES / GameBoy 参考）：

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景色 | `#1a1a2e` 或 `#0f0f1b` | 深色背景，护眼 |
| 卡片背景 | `#16213e` | 略浅于背景 |
| 主文字 | `#e0e0e0` 或 `#c0c0c0` | 高可读性 |
| 高亮色 | `#00ff88` 或 `#ffcc00` | 悬停、活跃状态 |
| 边框色 | `#3a3a5c` | 默认边框 |
| 警告/强调 | `#ff6b6b` | 重要标记 |
| 链接 | `#66b3ff` | 超链接 |

### 6.2 字体

```css
:root {
  --font-pixel-cn: 'Zpix', 'Press Start 2P', monospace;
  --font-pixel-en: 'Press Start 2P', 'Silkscreen', monospace;
  --font-pixel-code: 'Fira Code', 'Courier New', monospace;
}
```

- 中文推荐 zpix（最像素），备选系统自带像素体
- `font-size` 建议使用 px 单位，避免亚像素渲染导致模糊
- 正文 16px，标题 20-24px，代码 14px

### 6.3 边框 & 阴影

```css
.pixel-card {
  border: 4px solid var(--border-color);
  box-shadow: 4px 4px 0 #000;      /* 仅硬边阴影，无 blur */
  image-rendering: pixelated;       /* 图片不模糊 */
  image-rendering: crisp-edges;
}

.pixel-button {
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #333;
}

.pixel-button:active {
  transform: translate(2px, 2px);   /* 按下位移 */
  box-shadow: 1px 1px 0 #333;
}
```

### 6.4 动效原则

| 允许 | 禁止 |
|------|------|
| 硬切（step-end, steps()） | ease-in-out / linear 过渡 |
| 逐帧闪烁（`animation: blink 1s step-end infinite`） | opacity 平滑渐变 |
| 位移弹跳（离散位置变化） | 模糊阴影过渡 |
| 颜色硬切换 | `transition: all 0.3s ease` |

### 6.5 图片规范

- 所有插画由用户手绘，PNG 格式
- 导出尺寸：卡片插画 128×128px，小图标 32×32px
- CSS 强制 `image-rendering: pixelated` 确保缩放时保持像素锐度
- 透明背景，便于叠加到卡片/页面上

---

## 七、后续扩展

以下能力在设计层面已预留，不纳入首期开发：

- **搜索**：全站笔记内容搜索
- **暗色/亮色主题切换**：初期只做暗色像素主题
- **标签系统**：跨领域的笔记标签
- **音频播放**：合成器笔记中可能需要的音频示例组件
- **指板交互升级**：从静态图升级到可交互指板 + 音频

---

## 八、开发顺序建议

| 阶段 | 内容 | 产出 |
|------|------|------|
| 1. 脚手架 | Vite + React + Router + 像素风全局样式 | 可运行的空项目 |
| 2. 首页 | CategoryGrid + CategoryCard + PixelNavbar | 可浏览的首页 |
| 3. 内容页 | Sidebar + MarkdownRenderer + NotePage | 可阅读笔记 |
| 4. 指板组件 | Fretboard 组件 + CAGED 数据 | 吉他笔记可展示指板 |
| 5. 转场 & 动画 | PixelTransition + 像素动效 | 完整体验 |
| 6. 内容迁移 | 将《总笔记》内容转为 Markdown | 网站有真实内容 |
