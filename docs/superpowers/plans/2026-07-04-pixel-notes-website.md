# 像素风格个人学习笔记网站 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个像素风格的 React SPA 个人学习笔记网站，包含首页展柜和笔记内容页

**Architecture:** React + Vite + React Router + react-markdown。组件化开发，首页为 CategoryGrid → CategoryCard 网格，笔记页为 Sidebar + MarkdownRenderer 左右布局。引入全局像素风 CSS 设计系统，所有视觉遵循硬边阴影/像素字体规范。

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, react-markdown, CSS Modules, zpix/Press Start 2P 字体

---

## 文件结构总览

```
blog/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── public/
│   └── images/
│       ├── guitar.png          — 占位像素插画 128×128
│       ├── synth.png           — 占位像素插画 128×128
│       └── reading.png         — 占位像素插画 128×128
└── src/
    ├── main.tsx                — 入口
    ├── App.tsx                 — 路由 + PixelTransition 包裹
    ├── index.css               — 全局像素设计系统 CSS
    ├── vite-env.d.ts
    ├── data/
    │   └── categories.ts       — 笔记领域配置
    ├── content/
    │   ├── guitar/
    │   │   ├── intro.md
    │   │   ├── caged-system.md
    │   │   └── arpeggios.md
    │   ├── synth/
    │   │   └── placeholder.md
    │   └── reading/
    │       └── placeholder.md
    ├── components/
    │   ├── PixelNavbar/
    │   │   ├── PixelNavbar.tsx
    │   │   └── PixelNavbar.module.css
    │   ├── CategoryCard/
    │   │   ├── CategoryCard.tsx
    │   │   └── CategoryCard.module.css
    │   ├── CategoryGrid/
    │   │   ├── CategoryGrid.tsx
    │   │   └── CategoryGrid.module.css
    │   ├── Sidebar/
    │   │   ├── Sidebar.tsx
    │   │   └── Sidebar.module.css
    │   ├── MarkdownRenderer/
    │   │   ├── MarkdownRenderer.tsx
    │   │   └── MarkdownRenderer.module.css
    │   ├── Fretboard/
    │   │   ├── Fretboard.tsx
    │   │   ├── Fretboard.module.css
    │   │   └── cagedData.ts
    │   ├── PixelTransition/
    │   │   ├── PixelTransition.tsx
    │   │   └── PixelTransition.module.css
    │   └── PixelFooter/
    │       ├── PixelFooter.tsx
    │       └── PixelFooter.module.css
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── HomePage.module.css
    │   ├── NotePage.tsx
    │   └── NotePage.module.css
    └── hooks/
        └── useMarkdownPages.ts
```

---

### Task 1: 项目脚手架 — Vite + React + 依赖安装

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: 使用 Vite 创建 React + TypeScript 项目**

Run:
```bash
cd d:\MyProject\blog
npm create vite@latest . -- --template react-ts
```

Expected: 生成 package.json、tsconfig 文件、index.html、src/main.tsx 等骨架文件

- [ ] **Step 2: 安装额外依赖**

Run:
```bash
cd d:\MyProject\blog
npm install react-router-dom react-markdown remark-gfm
```

Expected: package.json 中 dependencies 新增 react-router-dom、react-markdown、remark-gfm

- [ ] **Step 3: 验证项目可启动**

Run:
```bash
cd d:\MyProject\blog
npm run dev
```

Expected: Vite 开发服务器启动，浏览器打开可见默认 Vite + React 页面

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project with dependencies"
```

---

### Task 2: 全局像素风设计系统 CSS

**Files:**
- Create: `src/index.css`

- [ ] **Step 1: 编写全局像素风 CSS 设计系统**

完整的 `src/index.css`：

```css
/* ===== 像素风全局设计系统 ===== */

/* --- 字体引入 --- */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

@font-face {
  font-family: 'Zpix';
  src: url('https://cdn.jsdelivr.net/npm/zpix@3.1.0/dist/Zpix.woff2') format('woff2');
  font-display: swap;
}

/* --- CSS 变量 --- */
:root {
  /* 配色 - 深色像素主题 */
  --color-bg: #0f0f1b;
  --color-card-bg: #16213e;
  --color-text: #c0c0c0;
  --color-text-dim: #6a6a8a;
  --color-highlight: #00ff88;
  --color-highlight-alt: #ffcc00;
  --color-border: #3a3a5c;
  --color-accent: #ff6b6b;
  --color-link: #66b3ff;

  /* 字体 */
  --font-pixel: 'Zpix', 'Press Start 2P', monospace;
  --font-code: 'Fira Code', 'Courier New', monospace;

  /* 间距 */
  --space-unit: 4px;
  --border-width: 4px;
}

/* --- 全局重置 --- */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

body {
  font-family: var(--font-pixel);
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.8;
  min-height: 100vh;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* --- 像素卡片 --- */
.pixel-card {
  border: var(--border-width) solid var(--color-border);
  box-shadow: 4px 4px 0 #000;
  background: var(--color-card-bg);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.pixel-card:hover {
  border-color: var(--color-highlight);
  box-shadow: 6px 6px 0 #000;
  transform: translate(-2px, -2px) scale(1.03);
}

.pixel-card--disabled {
  border-style: dashed;
  opacity: 0.5;
  cursor: not-allowed;
}

.pixel-card--disabled:hover {
  border-color: var(--color-border);
  box-shadow: 4px 4px 0 #000;
  transform: none;
}

/* --- 像素按钮 --- */
.pixel-button {
  font-family: var(--font-pixel);
  font-size: 14px;
  padding: 8px 16px;
  border: 3px solid #000;
  background: var(--color-card-bg);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 3px 3px 0 #333;
  text-transform: uppercase;
  image-rendering: pixelated;
}

.pixel-button:hover {
  background: var(--color-highlight);
  color: #000;
}

.pixel-button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #333;
}

.pixel-button--active {
  background: var(--color-highlight);
  color: #000;
  box-shadow: 1px 1px 0 #333;
  transform: translate(2px, 2px);
}

/* --- 像素链接 --- */
a {
  color: var(--color-link);
  text-decoration: none;
}

a:hover {
  color: var(--color-highlight);
}

/* --- 像素 divider --- */
.pixel-divider {
  border: none;
  border-top: 4px solid var(--color-border);
  box-shadow: 0 2px 0 #000;
  margin: 16px 0;
}

/* --- 像素标题 --- */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-pixel);
  color: var(--color-highlight);
  line-height: 1.4;
}

h1 { font-size: 24px; }
h2 { font-size: 20px; }
h3 { font-size: 18px; }

/* --- 像素代码块 --- */
pre {
  background: #0a0a14;
  border: 3px solid var(--color-border);
  padding: 16px;
  overflow-x: auto;
  font-family: var(--font-code);
  font-size: 14px;
  line-height: 1.6;
}

code {
  font-family: var(--font-code);
  background: #0a0a14;
  padding: 2px 6px;
  font-size: 14px;
}

pre code {
  background: none;
  padding: 0;
}

/* --- 像素引用块 --- */
blockquote {
  border-left: 4px solid var(--color-highlight);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--color-text-dim);
}

/* --- 滚动条 --- */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
  border: 2px solid var(--color-border);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border: 2px solid #000;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-highlight);
}

/* --- 闪烁动画 --- */
@keyframes pixel-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes pixel-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* --- 选中文字 --- */
::selection {
  background: var(--color-highlight);
  color: #000;
}

/* --- 图片像素渲染 --- */
img {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

- [ ] **Step 2: 在 main.tsx 中引入全局样式**

修改 `src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 3: 验证样式生效**

Run: `npm run dev`

打开浏览器，检查 body 背景是否为深色 `#0f0f1b`，字体是否为像素风格

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/main.tsx
git commit -m "feat: add global pixel-art design system CSS"
```

---

### Task 3: 笔记领域数据配置

**Files:**
- Create: `src/data/categories.ts`

- [ ] **Step 1: 创建 categories.ts 数据文件**

```typescript
export interface Category {
  slug: string;
  title: string;
  description: string;
  image: string;
  isAvailable: boolean;
}

export const categories: Category[] = [
  {
    slug: 'guitar',
    title: '爵士吉他',
    description: 'CAGED系统 · 琶音 · 音阶',
    image: '/images/guitar.png',
    isAvailable: true,
  },
  {
    slug: 'synth',
    title: '合成器制作',
    description: '敬请期待',
    image: '/images/synth.png',
    isAvailable: false,
  },
  {
    slug: 'reading',
    title: '读书笔记',
    description: '敬请期待',
    image: '/images/reading.png',
    isAvailable: false,
  },
];
```

- [ ] **Step 2: 验证文件编译无报错**

Run: `npx tsc --noEmit`

Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/data/categories.ts
git commit -m "feat: add category data configuration"
```

---

### Task 4: PixelNavbar 顶部导航栏

**Files:**
- Create: `src/components/PixelNavbar/PixelNavbar.tsx`
- Create: `src/components/PixelNavbar/PixelNavbar.module.css`

- [ ] **Step 1: 编写 PixelNavbar 组件**

`src/components/PixelNavbar/PixelNavbar.tsx`：

```tsx
import { Link, useLocation } from 'react-router-dom';
import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  const location = useLocation();

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link
          to="/"
          className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
        >
          [ 首页 ]
        </Link>
      </div>
      <div className={styles.right}>
        <span className={styles.sprite}>☺</span>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 编写 PixelNavbar 样式**

`src/components/PixelNavbar/PixelNavbar.module.css`：

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 4px solid #000;
  box-shadow: 0 4px 0 #3a3a5c;
  background: #16213e;
  position: sticky;
  top: 0;
  z-index: 100;
}

.left {
  display: flex;
  gap: 16px;
}

.right {
  display: flex;
  align-items: center;
}

.navLink {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-text);
  text-decoration: none;
  padding: 6px 12px;
  border: 2px solid transparent;
  background: none;
}

.navLink:hover {
  border-color: var(--color-highlight);
  color: var(--color-highlight);
}

.active {
  border-color: var(--color-highlight);
  color: var(--color-highlight);
}

.sprite {
  font-size: 24px;
  image-rendering: pixelated;
}
```

- [ ] **Step 3: 验证组件渲染**

在 `src/App.tsx` 中临时引入 `<PixelNavbar />`，启动 dev server 确认导航栏显示正常

- [ ] **Step 4: Commit**

```bash
git add src/components/PixelNavbar/
git commit -m "feat: add PixelNavbar component"
```

---

### Task 5: CategoryCard + CategoryGrid 组件

**Files:**
- Create: `src/components/CategoryCard/CategoryCard.tsx`
- Create: `src/components/CategoryCard/CategoryCard.module.css`
- Create: `src/components/CategoryGrid/CategoryGrid.tsx`
- Create: `src/components/CategoryGrid/CategoryGrid.module.css`

- [ ] **Step 1: 编写 CategoryCard 组件**

`src/components/CategoryCard/CategoryCard.tsx`：

```tsx
import { useNavigate } from 'react-router-dom';
import type { Category } from '../../data/categories';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
  onNavigate?: () => void;
}

export default function CategoryCard({ category, onNavigate }: CategoryCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!category.isAvailable) return;
    onNavigate?.();
    setTimeout(() => {
      navigate(`/notes/${category.slug}`);
    }, 200);
  };

  const cardClass = category.isAvailable
    ? `${styles.card} pixel-card`
    : `${styles.card} pixel-card pixel-card--disabled`;

  return (
    <div className={cardClass} onClick={handleClick}>
      <div className={styles.imageWrapper}>
        <img
          src={category.image}
          alt={category.title}
          className={styles.image}
        />
      </div>
      <h3 className={styles.title}>{category.title}</h3>
      <p className={styles.description}>{category.description}</p>
    </div>
  );
}
```

- [ ] **Step 2: 编写 CategoryCard 样式**

`src/components/CategoryCard/CategoryCard.module.css`：

```css
.card {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  cursor: pointer;
  transition: none;
  min-width: 200px;
}

.imageWrapper {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.image {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.title {
  font-family: var(--font-pixel);
  font-size: 16px;
  color: var(--color-highlight);
  text-align: center;
  margin: 0;
}

.description {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: var(--color-text-dim);
  text-align: center;
  line-height: 1.6;
}
```

- [ ] **Step 3: 编写 CategoryGrid 组件**

`src/components/CategoryGrid/CategoryGrid.tsx`：

```tsx
import { categories } from '../../data/categories';
import CategoryCard from '../CategoryCard/CategoryCard';
import styles from './CategoryGrid.module.css';

interface CategoryGridProps {
  onNavigate?: () => void;
}

export default function CategoryGrid({ onNavigate }: CategoryGridProps) {
  return (
    <div className={styles.grid}>
      {categories.map((category) => (
        <CategoryCard
          key={category.slug}
          category={category}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 编写 CategoryGrid 样式**

`src/components/CategoryGrid/CategoryGrid.module.css`：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
  padding: 32px 24px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}
```

- [ ] **Step 5: 验证组件渲染**

在 App.tsx 中临时渲染 `<CategoryGrid />`，确认卡片网格显示正常，悬停有弹起效果

- [ ] **Step 6: Commit**

```bash
git add src/components/CategoryCard/ src/components/CategoryGrid/
git commit -m "feat: add CategoryCard and CategoryGrid components"
```

---

### Task 6: HomePage 首页

**Files:**
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/HomePage.module.css`

- [ ] **Step 1: 编写 HomePage 组件**

`src/pages/HomePage.tsx`：

```tsx
import PixelNavbar from '../components/PixelNavbar/PixelNavbar';
import CategoryGrid from '../components/CategoryGrid/CategoryGrid';
import PixelFooter from '../components/PixelFooter/PixelFooter';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className={styles.page}>
      <PixelNavbar />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}> Pixel Notes</h1>
          <p className={styles.subtitle}>我的学习笔记世界</p>
        </div>
        <CategoryGrid />
      </main>
      <PixelFooter />
    </div>
  );
}
```

- [ ] **Step 2: 编写 HomePage 样式**

`src/pages/HomePage.module.css`：

```css
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding: 40px 0 60px;
}

.hero {
  text-align: center;
  padding: 40px 20px 20px;
}

.title {
  font-family: var(--font-pixel);
  font-size: 36px;
  color: var(--color-highlight);
  text-shadow: 4px 4px 0 #000;
  margin-bottom: 12px;
  letter-spacing: 4px;
}

.subtitle {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-text-dim);
}
```

- [ ] **Step 3: 在 App.tsx 中添加首页路由**

修改 `src/App.tsx`：

```tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
```

- [ ] **Step 4: 验证首页**

Run: `npm run dev`，访问 http://localhost:5173

Expected: 看到顶部导航栏 + "PIXEL NOTES" 标题 + 三个卡片网格

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.module.css src/App.tsx
git commit -m "feat: add HomePage with hero and category grid"
```

---

### Task 7: PixelFooter 组件

**Files:**
- Create: `src/components/PixelFooter/PixelFooter.tsx`
- Create: `src/components/PixelFooter/PixelFooter.module.css`

- [ ] **Step 1: 编写 PixelFooter 组件**

`src/components/PixelFooter/PixelFooter.tsx`：

```tsx
import styles from './PixelFooter.module.css';

export default function PixelFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>© 2026 Pixel Notes · Built with ☕</p>
    </footer>
  );
}
```

- [ ] **Step 2: 编写 PixelFooter 样式**

`src/components/PixelFooter/PixelFooter.module.css`：

```css
.footer {
  border-top: 4px solid #000;
  box-shadow: 0 -4px 0 #3a3a5c;
  background: #16213e;
  padding: 16px 24px;
  text-align: center;
}

.text {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: var(--color-text-dim);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PixelFooter/
git commit -m "feat: add PixelFooter component"
```

---

### Task 8: Markdown 笔记内容文件

**Files:**
- Create: `src/content/guitar/intro.md`
- Create: `src/content/guitar/caged-system.md`
- Create: `src/content/guitar/arpeggios.md`
- Create: `src/content/synth/placeholder.md`
- Create: `src/content/reading/placeholder.md`

- [ ] **Step 1: 创建吉他笔记 — intro.md**

`src/content/guitar/intro.md`：

```markdown
# 爵士吉他笔记

欢迎来到我的爵士吉他学习笔记。这里记录了我在学习爵士吉他过程中的心得、练习方法和理论知识。

## 学习路线

1. **CAGED 系统** — 理解指板的五种基本指形
2. **琶音** — 和弦音的分解练习
3. **音阶** — 大调、小调及调式音阶
4. **和弦 voicing** — 爵士和弦的按法与排列
```

- [ ] **Step 2: 创建吉他笔记 — caged-system.md**

`src/content/guitar/caged-system.md`：

```markdown
## CAGED 系统

CAGED 系统是吉他指板的五种基本指形，以开放和弦 C、A、G、E、D 命名。掌握这五种指形，就能在整个指板上自由移动。

### C 指形

以中指为根音，是最常用的指形之一。C 指形覆盖 5 根弦，从 5 弦到 1 弦。

<Fretboard caged="C" />

C 指形的根音位于 5 弦和 2 弦，记住这个位置对快速定位非常重要。

### A 指形

A 指形以食指为根音，根音位于 5 弦和 3 弦。

<Fretboard caged="A" />

### G 指形

G 指形根音位于 6 弦和 1 弦，跨度较大，需要手指充分伸展。

<Fretboard caged="G" />

### E 指形

E 指形根音位于 6 弦和 4 弦，是很多人学习 barre chord 的起点。

<Fretboard caged="E" />

### D 指形

D 指形根音位于 4 弦，是最小的指形之一，适合高把位演奏。

<Fretboard caged="D" />
```

- [ ] **Step 3: 创建吉他笔记 — arpeggios.md**

`src/content/guitar/arpeggios.md`：

```markdown
## 琶音

琶音（Arpeggio）是将和弦音依次弹出的技巧，是爵士即兴的基础。

### 大七和弦琶音（Maj7）

大七和弦琶音包含根音(1)、大三度(3)、纯五度(5)、大七度(7)四个音。

### 属七和弦琶音（Dom7）

属七和弦琶音包含根音(1)、大三度(3)、纯五度(5)、小七度(b7)。

### 小七和弦琶音（Min7）

小七和弦琶音包含根音(1)、小三度(b3)、纯五度(5)、小七度(b7)。
```

- [ ] **Step 4: 创建占位笔记**

`src/content/synth/placeholder.md`：

```markdown
# 合成器制作笔记

笔记整理中，敬请期待...
```

`src/content/reading/placeholder.md`：

```markdown
# 读书笔记

笔记整理中，敬请期待...
```

- [ ] **Step 5: 配置 Vite 的 Markdown 原始导入**

修改 `src/vite-env.d.ts`，添加 `.md` 模块声明：

```typescript
/// <reference types="vite/client" />

declare module '*.md' {
  const content: string;
  export default content;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/content/ src/vite-env.d.ts
git commit -m "feat: add markdown note content files"
```

---

### Task 9: useMarkdownPages Hook

**Files:**
- Create: `src/hooks/useMarkdownPages.ts`

- [ ] **Step 1: 编写 useMarkdownPages Hook**

`src/hooks/useMarkdownPages.ts`：

```typescript
import { useMemo } from 'react';

interface MarkdownPage {
  slug: string;
  title: string;
  content: string;
  order: number;
}

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

// Use Vite's import.meta.glob to load all .md files at build time
const modules = import.meta.glob<{ default: string }>(
  '../content/**/*.md',
  { eager: true, query: '?raw', import: 'default' }
);

function extractTitle(content: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : '未命名';
}

function extractHeadings(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    headings.push({ id, text, level });
  }
  return headings;
}

export function useMarkdownPages(category: string) {
  const pages = useMemo(() => {
    const result: MarkdownPage[] = [];
    const prefix = `../content/${category}/`;

    for (const [path, mod] of Object.entries(modules)) {
      if (path.startsWith(prefix)) {
        const slug = path.replace(prefix, '').replace('.md', '');
        const content = (mod as { default: string }).default;
        result.push({
          slug,
          title: extractTitle(content),
          content,
          order: 0,
        });
      }
    }

    return result;
  }, [category]);

  const allHeadings = useMemo(() => {
    const result: { pageSlug: string; headings: HeadingItem[] }[] = [];
    for (const page of pages) {
      result.push({
        pageSlug: page.slug,
        headings: extractHeadings(page.content),
      });
    }
    return result;
  }, [pages]);

  return { pages, allHeadings };
}
```

- [ ] **Step 2: 验证编译无报错**

Run: `npx tsc --noEmit`

Expected: 无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMarkdownPages.ts
git commit -m "feat: add useMarkdownPages hook for dynamic MD loading"
```

---

### Task 10: MarkdownRenderer 组件

**Files:**
- Create: `src/components/MarkdownRenderer/MarkdownRenderer.tsx`
- Create: `src/components/MarkdownRenderer/MarkdownRenderer.module.css`

- [ ] **Step 1: 编写 MarkdownRenderer 组件**

`src/components/MarkdownRenderer/MarkdownRenderer.tsx`：

```tsx
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Fretboard from '../Fretboard/Fretboard';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
  content: string;
}

// 自定义组件映射 — 处理 <Fretboard caged="C" /> 等特殊标签
const customComponents: Record<string, React.ComponentType<any>> = {
  Fretboard,
};

// 解析 Markdown 中的自定义 HTML 标签，替换为 React 组件占位符
function parseCustomComponents(content: string): {
  cleanedContent: string;
  placeholders: Map<string, { component: string; props: Record<string, string> }>;
} {
  const placeholders = new Map<string, { component: string; props: Record<string, string> }>();
  let index = 0;

  const cleanedContent = content.replace(
    /<(\w+)\s+([^>]+)\s*\/>/g,
    (match, tag, attrsStr) => {
      if (!customComponents[tag]) return match;

      const props: Record<string, string> = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        props[attrMatch[1]] = attrMatch[2];
      }

      const placeholder = `<!--CUSTOM_COMPONENT_${index}-->`;
      placeholders.set(placeholder, { component: tag, props });
      index++;
      return placeholder;
    }
  );

  return { cleanedContent, placeholders };
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { cleanedContent, placeholders } = useMemo(
    () => parseCustomComponents(content),
    [content]
  );

  return (
    <div className={styles.renderer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 自定义代码块渲染，检测自定义组件占位符
          p: ({ children, ...props }) => {
            const childText = extractText(children);
            if (typeof childText === 'string' && childText.startsWith('<!--CUSTOM_COMPONENT_')) {
              const parts = splitByPlaceholders(childText, placeholders);
              if (parts.length > 1 || parts[0]?.type === 'component') {
                return <>{parts.map((part, i) => renderPart(part, i))}</>;
              }
            }
            return <p {...props}>{children}</p>;
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(c => (typeof c === 'string' ? c : '')).join('');
  return '';
}

interface RenderPart {
  type: 'text' | 'component';
  content: string;
  component?: string;
  props?: Record<string, string>;
}

function splitByPlaceholders(
  text: string,
  placeholders: Map<string, { component: string; props: Record<string, string> }>
): RenderPart[] {
  const parts: RenderPart[] = [];
  const regex = /<!--CUSTOM_COMPONENT_\d+-->/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const placeholder = placeholders.get(match[0]);
    if (placeholder) {
      parts.push({
        type: 'component',
        content: match[0],
        component: placeholder.component,
        props: placeholder.props,
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

function renderPart(part: RenderPart, key: number): React.ReactNode {
  if (part.type === 'text') {
    return <span key={key}>{part.content}</span>;
  }
  if (part.component && customComponents[part.component]) {
    const Comp = customComponents[part.component];
    return <Comp key={key} {...part.props} />;
  }
  return null;
}
```

- [ ] **Step 2: 编写 MarkdownRenderer 样式**

`src/components/MarkdownRenderer/MarkdownRenderer.module.css`：

```css
.renderer {
  font-family: var(--font-pixel);
  font-size: 16px;
  line-height: 1.8;
  color: var(--color-text);
  max-width: 720px;
}

.renderer h1 {
  font-size: 24px;
  color: var(--color-highlight);
  margin: 32px 0 16px;
  padding-bottom: 8px;
  border-bottom: 4px solid var(--color-border);
}

.renderer h2 {
  font-size: 20px;
  color: var(--color-highlight);
  margin: 28px 0 12px;
}

.renderer h3 {
  font-size: 18px;
  color: var(--color-highlight-alt);
  margin: 24px 0 10px;
}

.renderer p {
  margin: 12px 0;
}

.renderer ul, .renderer ol {
  margin: 12px 0;
  padding-left: 24px;
}

.renderer li {
  margin: 6px 0;
}

.renderer img {
  max-width: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.renderer strong {
  color: var(--color-highlight);
}
```

- [ ] **Step 3: 验证编译无报错**

Run: `npx tsc --noEmit`

注意：Fretboard 组件尚未创建，临时注释掉 import 和 customComponents 中的引用，待 Task 11 完成后取消注释

- [ ] **Step 4: Commit**

```bash
git add src/components/MarkdownRenderer/
git commit -m "feat: add MarkdownRenderer with custom component support"
```

---

### Task 11: Fretboard 吉他指板组件 + CAGED 数据

**Files:**
- Create: `src/components/Fretboard/cagedData.ts`
- Create: `src/components/Fretboard/Fretboard.tsx`
- Create: `src/components/Fretboard/Fretboard.module.css`

- [ ] **Step 1: 编写 CAGED 数据配置**

`src/components/Fretboard/cagedData.ts`：

```typescript
export interface FretNote {
  string: number;   // 1-6 (1 = 高音E弦)
  fret: number;     // 0 = 空弦, 1+ = 按弦品格
}

export interface CagedShapeConfig {
  name: string;
  label: string;
  description: string;
  notes: FretNote[];
  rootString: number;
  rootFret: number;
}

// CAGED 五种指形的大三和弦按法（开放把位）
export const cagedShapes: Record<string, CagedShapeConfig> = {
  C: {
    name: 'C',
    label: 'C 指形',
    description: 'C指形以中指为根音。根音位于5弦3品和2弦1品。C指形是学习CAGED系统的起点，覆盖5弦到1弦。',
    notes: [
      { string: 5, fret: 3 },   // C (根音)
      { string: 4, fret: 2 },   // E
      { string: 3, fret: 0 },   // G (空弦)
      { string: 2, fret: 1 },   // C (根音)
      { string: 1, fret: 0 },   // E (空弦)
    ],
    rootString: 5,
    rootFret: 3,
  },
  A: {
    name: 'A',
    label: 'A 指形',
    description: 'A指形以食指为根音。根音位于5弦空弦和3弦2品。A指形是开放式五和弦的基础。',
    notes: [
      { string: 5, fret: 0 },   // A (根音, 空弦)
      { string: 4, fret: 2 },   // E
      { string: 3, fret: 2 },   // A (根音)
      { string: 2, fret: 2 },   // C#
      { string: 1, fret: 0 },   // E (空弦)
    ],
    rootString: 5,
    rootFret: 0,
  },
  G: {
    name: 'G',
    label: 'G 指形',
    description: 'G指形根音位于6弦3品和1弦3品。G指形跨度较大，需要手指充分伸展，适合中把位演奏。',
    notes: [
      { string: 6, fret: 3 },   // G (根音)
      { string: 5, fret: 2 },   // B
      { string: 4, fret: 0 },   // D (空弦)
      { string: 3, fret: 0 },   // G (空弦, 根音)
      { string: 2, fret: 0 },   // B (空弦)
      { string: 1, fret: 3 },   // G (根音)
    ],
    rootString: 6,
    rootFret: 3,
  },
  E: {
    name: 'E',
    label: 'E 指形',
    description: 'E指形根音位于6弦空弦和4弦2品。E指形是横按和弦的基础，也是Barre Chord的核心指形。',
    notes: [
      { string: 6, fret: 0 },   // E (根音, 空弦)
      { string: 5, fret: 2 },   // B
      { string: 4, fret: 2 },   // E (根音)
      { string: 3, fret: 1 },   // G#
      { string: 2, fret: 0 },   // B (空弦)
      { string: 1, fret: 0 },   // E (根音, 空弦)
    ],
    rootString: 6,
    rootFret: 0,
  },
  D: {
    name: 'D',
    label: 'D 指形',
    description: 'D指形根音位于4弦空弦和2弦3品。D指形是最小的指形，只覆盖4根弦（4弦到1弦），适合高把位演奏。',
    notes: [
      { string: 4, fret: 0 },   // D (根音, 空弦)
      { string: 3, fret: 2 },   // A
      { string: 2, fret: 3 },   // D (根音)
      { string: 1, fret: 2 },   // F#
    ],
    rootString: 4,
    rootFret: 0,
  },
};
```

- [ ] **Step 2: 编写 Fretboard 组件**

`src/components/Fretboard/Fretboard.tsx`：

```tsx
import { useState } from 'react';
import { cagedShapes, type CagedShapeConfig } from './cagedData';
import styles from './Fretboard.module.css';

interface FretboardProps {
  caged?: string;
  showNotes?: boolean;
  startFret?: number;
  endFret?: number;
  caption?: string;
}

const CAGED_KEYS = ['C', 'A', 'G', 'E', 'D'];
const STRING_NAMES = ['1(E)', '2(B)', '3(G)', '4(D)', '5(A)', '6(E)'];

export default function Fretboard({
  caged = 'C',
  showNotes = false,
  startFret,
  endFret,
  caption,
}: FretboardProps) {
  const [activeShape, setActiveShape] = useState<string>(caged);
  const shape: CagedShapeConfig | undefined = cagedShapes[activeShape];

  const fretStart = startFret ?? shape?.rootFret ?? 0;
  const fretEnd = endFret ?? (fretStart + 5);
  const fretCount = fretEnd - fretStart + 1;

  const hasNote = (stringNum: number, fretNum: number): boolean => {
    if (!shape) return false;
    return shape.notes.some(n => n.string === stringNum && n.fret === fretNum);
  };

  const isRoot = (stringNum: number, fretNum: number): boolean => {
    if (!shape) return false;
    return shape.notes.some(
      n => n.string === stringNum && n.fret === fretNum
        && n.string === shape.rootString && n.fret === shape.rootFret
    );
  };

  return (
    <div className={styles.fretboardContainer}>
      {/* CAGED 选择器 */}
      <div className={styles.selector}>
        {CAGED_KEYS.map((key) => (
          <button
            key={key}
            className={`pixel-button ${activeShape === key ? 'pixel-button--active' : ''}`}
            onClick={() => setActiveShape(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {/* 指板图 */}
      <div className={styles.fretboard}>
        {[1, 2, 3, 4, 5, 6].map((stringNum) => (
          <div key={stringNum} className={styles.string}>
            <span className={styles.stringLabel}>{STRING_NAMES[6 - stringNum]}</span>
            <div className={styles.fretRow}>
              {Array.from({ length: fretCount }, (_, i) => {
                const fretNum = fretStart + i;
                const note = hasNote(stringNum, fretNum);
                const root = isRoot(stringNum, fretNum);
                return (
                  <div key={i} className={styles.fret}>
                    {/* 品格线 */}
                    {note && (
                      <span className={`${styles.dot} ${root ? styles.dotRoot : ''}`}>
                        {showNotes ? '●' : '●'}
                      </span>
                    )}
                    {!note && fretNum === 0 && (
                      <span className={styles.dotOpen}>○</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 品格数字 */}
        <div className={styles.fretNumbers}>
          <span className={styles.stringLabel}></span>
          <div className={styles.fretRow}>
            {Array.from({ length: fretCount }, (_, i) => (
              <span key={i} className={styles.fretNum}>{fretStart + i}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 + 说明 */}
      <div className={styles.caption}>
        <span className={styles.legend}>
          <span className={styles.dotSample}>●</span> 按弦
          <span className={styles.dotRootSample}>●</span> 根音
          <span className={styles.dotOpen}>○</span> 空弦
        </span>
        <p className={styles.description}>
          {caption || shape?.description || ''}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 编写 Fretboard 样式**

`src/components/Fretboard/Fretboard.module.css`：

```css
.fretboardContainer {
  margin: 24px 0;
  border: 4px solid var(--color-border);
  box-shadow: 4px 4px 0 #000;
  background: #0a0a14;
  padding: 20px;
}

.selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.fretboard {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-x: auto;
  padding: 8px 0;
}

.string {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stringLabel {
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--color-text-dim);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.fretRow {
  display: flex;
  flex: 1;
}

.fret {
  width: 48px;
  height: 32px;
  border-right: 2px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.fret:first-child {
  border-left: 4px solid #888;
}

.dot {
  font-size: 16px;
  color: var(--color-text);
  z-index: 1;
}

.dotRoot {
  color: var(--color-highlight);
  font-size: 20px;
  text-shadow: 0 0 4px var(--color-highlight);
}

.dotOpen {
  font-size: 14px;
  color: var(--color-text-dim);
  z-index: 1;
}

.fretNumbers {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.fretNum {
  width: 48px;
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--color-text-dim);
  text-align: center;
}

.caption {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed var(--color-border);
}

.legend {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--font-pixel);
  font-size: 11px;
  color: var(--color-text-dim);
  margin-bottom: 10px;
}

.dotSample {
  color: var(--color-text);
  font-size: 14px;
}

.dotRootSample {
  color: var(--color-highlight);
  font-size: 16px;
}

.description {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.7;
  margin: 0;
}
```

- [ ] **Step 4: 更新 MarkdownRenderer 取消 Fretboard 注释**

回到 `src/components/MarkdownRenderer/MarkdownRenderer.tsx`，确保 Fretboard 的 import 和 customComponents 已生效：

```tsx
import Fretboard from '../Fretboard/Fretboard';

const customComponents: Record<string, React.ComponentType<any>> = {
  Fretboard,
};
```

- [ ] **Step 5: 验证编译无报错**

Run: `npx tsc --noEmit`

Expected: 无 TypeScript 错误

- [ ] **Step 6: Commit**

```bash
git add src/components/Fretboard/
git commit -m "feat: add Fretboard component with CAGED shape data"
```

---

### Task 12: Sidebar 目录组件

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/Sidebar.module.css`

- [ ] **Step 1: 编写 Sidebar 组件**

`src/components/Sidebar/Sidebar.tsx`：

```tsx
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface SidebarProps {
  pages: { slug: string; title: string }[];
  headingsByPage: { pageSlug: string; headings: HeadingItem[] }[];
  activeSlug?: string;
  onNavigate: (slug: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  pages,
  headingsByPage,
  activeSlug,
  onNavigate,
  isOpen,
  onClose,
}: SidebarProps) {
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());

  // 移动端菜单打开时禁止 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const toggleCollapse = (slug: string) => {
    setCollapsedPages(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleNavigate = (slug: string, headingId?: string) => {
    onNavigate(slug);
    if (headingId) {
      setTimeout(() => {
        document.getElementById(headingId)?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
    // 移动端关闭菜单
    if (window.innerWidth < 768) onClose();
  };

  const sidebarContent = (
    <nav className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>📑</span>
        <span className={styles.headerText}>目录</span>
      </div>
      <div className={styles.list}>
        {pages.map((page) => {
          const headingData = headingsByPage.find(h => h.pageSlug === page.slug);
          const isActive = page.slug === activeSlug;
          const isCollapsed = collapsedPages.has(page.slug);
          const hasHeadings = headingData && headingData.headings.length > 0;

          return (
            <div key={page.slug} className={styles.pageGroup}>
              <div
                className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                onClick={() => hasHeadings ? toggleCollapse(page.slug) : handleNavigate(page.slug)}
              >
                <span className={styles.pageTitle}>{page.title}</span>
                {hasHeadings && (
                  <span className={`${styles.arrow} ${isCollapsed ? styles.arrowCollapsed : ''}`}>
                    ▾
                  </span>
                )}
              </div>

              {hasHeadings && !isCollapsed && (
                <div className={styles.headings}>
                  {headingData!.headings.map((heading) => (
                    <div
                      key={heading.id}
                      className={`${styles.headingItem} ${heading.level === 3 ? styles.headingL3 : ''}`}
                      onClick={() => handleNavigate(page.slug, heading.id)}
                    >
                      {heading.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* 桌面端：固定侧边栏 */}
      <aside className={styles.desktopSidebar}>
        {sidebarContent}
      </aside>

      {/* 移动端：汉堡按钮 + 覆盖层 */}
      <button className={styles.hamburger} onClick={() => onClose ? onClose() : null}>
        ☰
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={onClose} />
          <aside className={styles.mobileSidebar}>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: 上述代码中的移动端逻辑有误，重写为正确的版本**

由于 hamburger 按钮逻辑有问题，以下是修正后的 Sidebar：

`src/components/Sidebar/Sidebar.tsx`（完整修正）：

```tsx
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface SidebarProps {
  pages: { slug: string; title: string }[];
  headingsByPage: { pageSlug: string; headings: HeadingItem[] }[];
  activeSlug?: string;
  onNavigate: (slug: string, headingId?: string) => void;
}

export default function Sidebar({
  pages,
  headingsByPage,
  activeSlug,
  onNavigate,
}: SidebarProps) {
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleCollapse = (slug: string) => {
    setCollapsedPages(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleNavigate = (slug: string, headingId?: string) => {
    onNavigate(slug, headingId);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div className={styles.header}>
        <span>📑 目录</span>
      </div>
      <div className={styles.list}>
        {pages.map((page) => {
          const headingData = headingsByPage.find(h => h.pageSlug === page.slug);
          const isActive = page.slug === activeSlug;
          const isCollapsed = collapsedPages.has(page.slug);
          const hasHeadings = headingData && headingData.headings.length > 0;

          return (
            <div key={page.slug} className={styles.pageGroup}>
              <button
                className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                onClick={() => {
                  if (hasHeadings) {
                    toggleCollapse(page.slug);
                  }
                  handleNavigate(page.slug);
                }}
              >
                <span className={styles.pageTitle}>{page.title}</span>
                {hasHeadings && (
                  <span className={`${styles.arrow} ${isCollapsed ? styles.arrowCollapsed : ''}`}>
                    ▾
                  </span>
                )}
              </button>

              {hasHeadings && !isCollapsed && (
                <div className={styles.headings}>
                  {headingData!.headings.map((heading) => (
                    <button
                      key={heading.id}
                      className={`${styles.headingItem} ${heading.level === 3 ? styles.headingL3 : ''}`}
                      onClick={() => handleNavigate(page.slug, heading.id)}
                    >
                      {heading.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* 移动端汉堡按钮 */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="打开目录"
      >
        ☰ 目录
      </button>

      {/* 桌面端固定侧边栏 */}
      <aside className={styles.desktopSidebar}>
        {sidebarContent}
      </aside>

      {/* 移动端覆盖 */}
      {mobileOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
          <aside className={styles.mobileSidebar}>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 3: 编写 Sidebar 样式**

`src/components/Sidebar/Sidebar.module.css`：

```css
.desktopSidebar {
  display: block;
  width: 220px;
  flex-shrink: 0;
  border-right: 4px solid #000;
  box-shadow: 4px 0 0 #3a3a5c;
  background: #16213e;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 40px;
}

.header {
  padding: 16px;
  border-bottom: 3px solid var(--color-border);
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-highlight);
  display: flex;
  align-items: center;
  gap: 8px;
}

.list {
  padding: 8px 0;
}

.pageGroup {
  border-bottom: 1px solid #1a1a30;
}

.pageItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--color-text);
  font-family: var(--font-pixel);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.pageItem:hover {
  background: #1a1a35;
  color: var(--color-highlight);
}

.pageItemActive {
  border-left: 4px solid var(--color-highlight);
  background: #1a1a35;
  color: var(--color-highlight);
  padding-left: 12px;
}

.pageTitle {
  flex: 1;
}

.arrow {
  font-size: 10px;
  color: var(--color-text-dim);
  transition: none;
}

.arrowCollapsed {
  transform: rotate(-90deg);
}

.headings {
  padding: 0 0 8px;
}

.headingItem {
  display: block;
  width: 100%;
  padding: 6px 24px;
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-family: var(--font-pixel);
  font-size: 11px;
  cursor: pointer;
  text-align: left;
}

.headingItem:hover {
  color: var(--color-highlight);
  background: #0f0f25;
}

.headingL3 {
  padding-left: 36px;
  font-size: 10px;
}

/* 汉堡按钮 — 移动端专用 */
.hamburger {
  display: none;
  font-family: var(--font-pixel);
  font-size: 14px;
  padding: 8px 16px;
  background: var(--color-card-bg);
  color: var(--color-highlight);
  border: 3px solid var(--color-border);
  cursor: pointer;
  position: fixed;
  top: 72px;
  left: 8px;
  z-index: 90;
  box-shadow: 2px 2px 0 #000;
}

.hamburger:active {
  transform: translate(2px, 2px);
}

.overlay {
  display: none;
}

.mobileSidebar {
  display: none;
}

@media (max-width: 768px) {
  .desktopSidebar {
    display: none;
  }

  .hamburger {
    display: block;
  }

  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 95;
  }

  .mobileSidebar {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    z-index: 100;
    background: #16213e;
    border-right: 4px solid #000;
    box-shadow: 4px 0 0 #3a3a5c;
    overflow-y: auto;
  }
}
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`

Expected: 无 TypeScript 错误

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar/
git commit -m "feat: add Sidebar component with mobile support"
```

---

### Task 13: NotePage 笔记内容页

**Files:**
- Create: `src/pages/NotePage.tsx`
- Create: `src/pages/NotePage.module.css`

- [ ] **Step 1: 编写 NotePage 组件**

`src/pages/NotePage.tsx`：

```tsx
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { categories } from '../data/categories';
import { useMarkdownPages } from '../hooks/useMarkdownPages';
import Sidebar from '../components/Sidebar/Sidebar';
import MarkdownRenderer from '../components/MarkdownRenderer/MarkdownRenderer';
import styles from './NotePage.module.css';

export default function NotePage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [activeSlug, setActiveSlug] = useState<string>('');

  const categoryInfo = categories.find(c => c.slug === category);

  const { pages, allHeadings } = useMarkdownPages(category || '');

  const sortedPages = useMemo(() => {
    // 按 intro → 其他 → placeholder 排序
    return [...pages].sort((a, b) => {
      if (a.slug === 'intro') return -1;
      if (b.slug === 'intro') return 1;
      if (a.slug === 'placeholder') return 1;
      if (b.slug === 'placeholder') return -1;
      return a.slug.localeCompare(b.slug);
    });
  }, [pages]);

  useEffect(() => {
    if (sortedPages.length > 0 && !activeSlug) {
      setActiveSlug(sortedPages[0].slug);
    }
  }, [sortedPages, activeSlug]);

  const activePage = useMemo(
    () => sortedPages.find(p => p.slug === activeSlug),
    [sortedPages, activeSlug]
  );

  const handleNavigate = (slug: string, headingId?: string) => {
    setActiveSlug(slug);
    if (headingId) {
      setTimeout(() => {
        document.getElementById(headingId)?.scrollIntoView({ behavior: 'auto' });
      }, 150);
    }
  };

  if (!categoryInfo || !categoryInfo.isAvailable) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>404</h1>
          <p>该笔记领域尚未开放</p>
          <Link to="/" className="pixel-button">← 返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          ← 返回
        </Link>
        <h1 className={styles.categoryTitle}>
          {categoryInfo.title}
        </h1>
        <div className={styles.spacer} />
      </header>

      <div className={styles.body}>
        <Sidebar
          pages={sortedPages}
          headingsByPage={allHeadings}
          activeSlug={activeSlug}
          onNavigate={handleNavigate}
        />

        <main className={styles.content}>
          {activePage ? (
            <MarkdownRenderer content={activePage.content} />
          ) : (
            <p className={styles.emptyHint}>请从左侧目录选择一篇笔记</p>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写 NotePage 样式**

`src/pages/NotePage.module.css`：

```css
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topBar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 4px solid #000;
  box-shadow: 0 4px 0 #3a3a5c;
  background: #16213e;
  position: sticky;
  top: 0;
  z-index: 50;
}

.backLink {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-link);
  text-decoration: none;
}

.backLink:hover {
  color: var(--color-highlight);
}

.categoryTitle {
  font-family: var(--font-pixel);
  font-size: 18px;
  color: var(--color-highlight);
  margin: 0 auto;
  text-align: center;
}

.spacer {
  width: 60px;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  max-height: calc(100vh - 60px);
}

.emptyHint {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--color-text-dim);
  text-align: center;
  margin-top: 80px;
}

.notFound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  text-align: center;
}

.notFound h1 {
  font-size: 48px;
  color: var(--color-accent);
  text-shadow: 4px 4px 0 #000;
}

@media (max-width: 768px) {
  .content {
    padding: 16px;
    margin-top: 0;
  }
}
```

- [ ] **Step 3: 在 App.tsx 中添加 NotePage 路由**

修改 `src/App.tsx`：

```tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotePage from './pages/NotePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/notes/:category" element={<NotePage />} />
    </Routes>
  );
}
```

- [ ] **Step 4: 验证完整流程**

Run: `npm run dev`

测试：
1. 首页 → 点击"爵士吉他"卡片 → 跳转到 `/notes/guitar`
2. 左侧目录显示 intro、caged-system、arpeggios 三篇
3. 点击 caged-system → 正文渲染带 Fretboard 组件的 Markdown
4. 点击不可用的卡片 → 不应跳转

- [ ] **Step 5: Commit**

```bash
git add src/pages/NotePage.tsx src/pages/NotePage.module.css src/App.tsx
git commit -m "feat: add NotePage with sidebar and markdown rendering"
```

---

### Task 14: PixelTransition 像素转场动画

**Files:**
- Create: `src/components/PixelTransition/PixelTransition.tsx`
- Create: `src/components/PixelTransition/PixelTransition.module.css`

- [ ] **Step 1: 编写 PixelTransition 组件**

`src/components/PixelTransition/PixelTransition.tsx`：

```tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './PixelTransition.module.css';

const COLS = 16;
const ROWS = 10;

interface PixelTransitionProps {
  onTransitionEnd?: () => void;
}

export default function PixelTransition({ onTransitionEnd }: PixelTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'covering' | 'uncovering'>('idle');
  const cellsRef = useRef<HTMLDivElement>(null);

  const triggerTransition = useCallback((navigateFn: () => void) => {
    setPhase('covering');
    // 覆盖动画完成后执行导航
    setTimeout(() => {
      navigateFn();
      // 短暂延迟后开始揭示
      setTimeout(() => {
        setPhase('uncovering');
      }, 100);
    }, 350);
  }, []);

  useEffect(() => {
    if (phase === 'uncovering') {
      const timer = setTimeout(() => {
        setPhase('idle');
        onTransitionEnd?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, onTransitionEnd]);

  // 暴露 trigger 方法给父组件
  useEffect(() => {
    (window as any).__pixelTransition = { trigger: triggerTransition };
    return () => { delete (window as any).__pixelTransition; };
  }, [triggerTransition]);

  if (phase === 'idle') return null;

  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const delay = phase === 'covering'
      ? (row + col) * 20
      : ((ROWS - 1 - row) + (COLS - 1 - col)) * 20;

    return (
      <div
        key={i}
        className={`${styles.cell} ${phase === 'covering' ? styles.cellCover : styles.cellUncover}`}
        style={{
          gridRow: row + 1,
          gridColumn: col + 1,
          animationDelay: `${delay}ms`,
        }}
      />
    );
  });

  return (
    <div className={styles.overlay} ref={cellsRef}>
      {cells}
    </div>
  );
}

// 触发转场的全局函数
export function navigateWithTransition(navigateFn: () => void) {
  const pt = (window as any).__pixelTransition;
  if (pt?.trigger) {
    pt.trigger(navigateFn);
  } else {
    navigateFn();
  }
}
```

- [ ] **Step 2: 编写 PixelTransition 样式**

`src/components/PixelTransition/PixelTransition.module.css`：

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  grid-template-rows: repeat(10, 1fr);
  pointer-events: none;
}

.cell {
  background: #000;
  animation-fill-mode: forwards;
  animation-timing-function: step-end;
}

.cellCover {
  animation-name: pixelCover;
  animation-duration: 350ms;
}

.cellUncover {
  animation-name: pixelUncover;
  animation-duration: 350ms;
}

@keyframes pixelCover {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes pixelUncover {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
```

- [ ] **Step 3: 更新 CategoryCard 使用转场**

修改 `src/components/CategoryCard/CategoryCard.tsx` 中的 handleClick：

```tsx
import { useNavigate } from 'react-router-dom';
import { navigateWithTransition } from '../PixelTransition/PixelTransition';
import type { Category } from '../../data/categories';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!category.isAvailable) return;
    navigateWithTransition(() => {
      navigate(`/notes/${category.slug}`);
    });
  };

  // ... 其余保持不变
}
```

- [ ] **Step 4: 在 App.tsx 中包裹 PixelTransition**

修改 `src/App.tsx`：

```tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotePage from './pages/NotePage';
import PixelTransition from './components/PixelTransition/PixelTransition';

export default function App() {
  return (
    <>
      <PixelTransition />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes/:category" element={<NotePage />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 5: 验证转场效果**

Run: `npm run dev`

在首页点击"爵士吉他"卡片 → 观察是否有像素方块覆盖 + 展开动画

Expected: 16×10 黑色方块从左上到右下逐块覆盖，跳转后从右下到左上逐块消失

- [ ] **Step 6: Commit**

```bash
git add src/components/PixelTransition/ src/components/CategoryCard/CategoryCard.tsx src/App.tsx
git commit -m "feat: add PixelTransition page transition animation"
```

---

### Task 15: 占位像素插画图片

**Files:**
- Create: `public/images/guitar.png`
- Create: `public/images/synth.png`
- Create: `public/images/reading.png`

- [ ] **Step 1: 生成占位像素插画**

三个占位图片使用像素风格绘制。由于无法直接生成 PNG 文件，使用以下方法创建 SVG 占位（后续用户自己替换为手绘 PNG）：

无需真正创建占位图片文件 — 在 CategoryCard 中添加 fallback 处理，如果图片加载失败则显示像素风 emoji 占位符。

修改 `src/components/CategoryCard/CategoryCard.tsx` 中的 image 部分：

```tsx
// 在 imageWrapper 中增加 onError 处理
const [imgError, setImgError] = useState(false);

// image 部分变为：
<div className={styles.imageWrapper}>
  {imgError ? (
    <span className={styles.placeholderEmoji}>🎸</span>
  ) : (
    <img
      src={category.image}
      alt={category.title}
      className={styles.image}
      onError={() => setImgError(true)}
    />
  )}
</div>
```

在 `CategoryCard.module.css` 中添加：

```css
.placeholderEmoji {
  font-size: 48px;
  image-rendering: pixelated;
}
```

需要在 CategoryCard 组件顶部添加 `import { useState } from 'react';`

- [ ] **Step 2: 为不同领域设定不同的 fallback emoji**

修改 CategoryCard 接收一个 emoji fallback：

在 `src/data/categories.ts` 中添加 emoji 字段：

```typescript
export interface Category {
  slug: string;
  title: string;
  description: string;
  image: string;
  isAvailable: boolean;
  emoji: string;   // fallback emoji
}

export const categories: Category[] = [
  {
    slug: 'guitar',
    title: '爵士吉他',
    description: 'CAGED系统 · 琶音 · 音阶',
    image: '/images/guitar.png',
    isAvailable: true,
    emoji: '🎸',
  },
  {
    slug: 'synth',
    title: '合成器制作',
    description: '敬请期待',
    image: '/images/synth.png',
    isAvailable: false,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: '读书笔记',
    description: '敬请期待',
    image: '/images/reading.png',
    isAvailable: false,
    emoji: '📚',
  },
];
```

CategoryCard 中使用：

```tsx
{imgError ? (
  <span className={styles.placeholderEmoji}>{category.emoji}</span>
) : (
  <img ... />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/categories.ts src/components/CategoryCard/CategoryCard.tsx src/components/CategoryCard/CategoryCard.module.css
git commit -m "feat: add emoji fallback for missing pixel art images"
```

---

### Task 16: 最终集成验证 & 清理

**Files:**
- Modify: `src/App.tsx` （确认最终版本）
- Modify: `index.html` （更新标题）

- [ ] **Step 1: 更新 index.html 标题**

修改 `index.html` 的 `<title>`：

```html
<title>Pixel Notes - 我的学习笔记</title>
```

- [ ] **Step 2: 确认 App.tsx 最终版本**

`src/App.tsx` 最终完整内容：

```tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotePage from './pages/NotePage';
import PixelTransition from './components/PixelTransition/PixelTransition';

export default function App() {
  return (
    <>
      <PixelTransition />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes/:category" element={<NotePage />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 3: 完整流程验证**

Run: `npm run dev`

验证清单：
- [ ] 首页：导航栏 + 标题 + 3张卡片网格，悬停弹起
- [ ] 禁用卡片：虚线边框、半透明、不可点击
- [ ] 点击"爵士吉他"：像素转场动画 → NotePage
- [ ] NotePage：左侧目录 + 右侧正文
- [ ] 目录可折叠、当前页高亮
- [ ] Markdown 渲染正常（标题、列表、代码块、引用块）
- [ ] Fretboard 组件：5 个 CAGED 按钮可切换指形
- [ ] 指板图上根音用绿色高亮、空弦显示空心圈
- [ ] 移动端：目录折叠到汉堡菜单
- [ ] 点击"返回"回到首页

- [ ] **Step 4: 生产构建验证**

Run:
```bash
npm run build
npm run preview
```

Expected: 构建成功，预览页面功能正常

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete Pixel Notes website with all components"
```

---

## 开发顺序总结

| 任务 | 内容 | 依赖 |
|------|------|------|
| 1 | 项目脚手架 | — |
| 2 | 全局像素 CSS | 1 |
| 3 | 数据配置 | 1 |
| 4 | PixelNavbar | 2 |
| 5 | CategoryCard + Grid | 2, 3 |
| 6 | HomePage | 4, 5 |
| 7 | PixelFooter | 2 |
| 8 | Markdown 内容文件 | 1 |
| 9 | useMarkdownPages Hook | 8 |
| 10 | MarkdownRenderer | 2 |
| 11 | Fretboard + CAGED 数据 | 2 |
| 12 | Sidebar | 2 |
| 13 | NotePage | 9, 10, 12 |
| 14 | PixelTransition | 2 |
| 15 | 占位图片 fallback | 3, 5 |
| 16 | 最终集成验证 | 全部 |
