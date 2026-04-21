# GameGulf Blog

GameGulf Blog 是挂在 `https://www.gamegulf.com/blog` 下的静态博客，用来做**决策型购买指南**，不是内容农场。

核心目标只有一个：帮助玩家更快判断

- 现在买不买
- 要不要等打折
- 这游戏适不适合自己
- 看完之后下一步该去哪里

详细的产品、文案、UX 规则见 [AGENTS.md](./AGENTS.md)。

## 技术栈

| 组件 | 作用 |
| --- | --- |
| Astro 5 | 静态站点生成、路由、内容集合 |
| React 19 | 少量可复用 TSX 组件 |
| TypeScript | 类型与内容模型 |
| Node.js 脚本 | 提取数据、校验文章、同步价格表 |
| @astrojs/sitemap | 生成 sitemap |

## 环境要求

- Node.js 20+
- `js-yaml` 已作为运行时依赖使用

## 本地开发

```bash
npm install
npm run dev
```

默认地址一般是：

```text
http://localhost:4321/blog
```

常用命令：

```bash
npm run build
npm run preview
```

## 项目结构

```text
src/
├── content.config.ts             # posts collection schema
├── content/
│   └── posts/{locale}/*.md       # 各语言文章
├── components/                   # Astro / TSX 组件
├── layouts/BaseLayout.astro      # 页面壳、SEO、JSON-LD
├── lib/
│   ├── blog.ts                   # 内容读取、卡片模型、SEO 辅助
│   ├── decision-card-display.ts  # 列表卡片展示逻辑
│   ├── i18n.ts                   # 语言与路径
│   └── topics.ts                 # Guide 主题配置
├── pages/
│   ├── index.astro               # /blog 语言入口
│   ├── 404.astro
│   ├── robots.txt.ts
│   └── [locale]/
│       ├── index.astro           # 语言首页（服务端渲染的决策列表）
│       ├── [slug].astro          # 文章详情页
│       └── guides/[topic].astro  # 主题聚合页
└── styles/globals.css

scripts/
├── extract-game-brief.mjs        # 从 GameGulf / Steam / HLTB 提取 brief
├── batch-extract.mjs             # 批量提取
├── check-existing.mjs            # 查重
├── validate-article.mjs          # 校验文章
├── sync-article-pricing.mjs      # 同步价格表、cardPrice 等
└── queue-next.mjs                # 队列管理

content/
├── briefs/*.json                 # 提取结果
├── game-queue.json               # 待处理队列
├── hltb-mapping.json             # 游戏 -> HLTB 映射
└── templates/
    ├── synthesis-prompt.md
    ├── article-generation-prompt.md
    └── game-guide-template.md
```

## 当前内容模型

当前文章模型是 **主平台优先**：

- 每篇文章只围绕**一个主平台**给购买结论
- 正文不做平台矩阵，不展开所有平台并列比较
- 如果还有其他版本，详情页会给一个轻量提示，用户回 **GameGulf 主站详情页** 看实时价格

相关文章 frontmatter 已支持这些可选字段：

- `primaryPlatformKey`
- `primaryPlatformLabel`
- `hasOtherPlatforms`
- `otherPlatformLabels`

这些字段是**向后兼容**的；旧文章没有也能正常渲染。

## 首页与详情页规则

### 语言首页

`/blog/{locale}` 现在是**服务端静态渲染**：

- 不依赖客户端 hydration 才能看到文章列表
- 首页的 featured + latest 卡片会直接输出到 HTML
- 这样即使前端脚本异常，列表页也仍然可用

### 文章详情页

文章页的结构是：

- 主平台 verdict
- 快速回答 / quick answer
- 游戏概览
- 正文
- FAQ

如果存在其他版本：

- 页面显示一个轻量提示块
- 提示块只负责把用户带回 GameGulf 主站详情页
- 不在博客正文里把其他平台展开成第二套 verdict

## 文章生成流程

整个流程分两段：**脚本收集数据，AI 写文章**

```text
GameGulf URL
    │
    ▼
Phase 0  查重
    node scripts/check-existing.mjs <url>

Phase 1  提取 brief
    node scripts/extract-game-brief.mjs <url>
    -> content/briefs/{slug}.json

Phase 2  AI 写稿
    使用 brief + prompts
    -> src/content/posts/{locale}/{slug}.md

Phase 3  校验
    node scripts/validate-article.mjs <files>

Phase 4  构建
    npm run build
```

### 快速开始

```bash
# 1. 查是否已存在
node scripts/check-existing.mjs https://www.gamegulf.com/detail/<gameId>

# 2. 提取 brief
node scripts/extract-game-brief.mjs https://www.gamegulf.com/detail/<gameId>

# 3. 用 prompts + brief 生成文章

# 4. 校验
node scripts/validate-article.mjs src/content/posts/en/{slug}.md

# 5. 构建
npm run build
```

### npm 快捷命令

```bash
npm run brief -- <url>
npm run brief:batch -- <url1> <url2>
npm run build
npm run preview
```

## 数据来源

| 来源 | 数据 | 方式 |
| --- | --- | --- |
| GameGulf | 区服价格、趋势、折扣历史、游戏元数据 | Nuxt payload 解析 |
| Steam | 评论、标签、开发商、简介 | Steam Store API |
| HLTB | 主线 / 扩展 / 完成时长 | 页面抓取 |

说明：

- 价格分析由脚本从趋势数据计算得出
- `AR`（阿根廷）价格默认排除，不参与文章价格输出
- 提取脚本已兼容多平台 detail 页面

## 多平台策略

对多平台 detail 页，当前流程是：

1. 提取所有可用平台数据
2. 生成时只选一个**主平台**
3. 文章正文只围绕这个主平台写
4. 如果还有其他版本：
   - 在详情页给轻量提示
   - 引导去 GameGulf 主站详情页比较

这套策略主要服务 SEO / GEO：

- 一篇文章只回答一个清晰问题
- 避免平台差异把正文写散
- 其他版本信息不丢，但不抢主结论

## 国际化

当前支持 7 个语言：

- `en`
- `zh-hans`
- `ja`
- `fr`
- `es`
- `de`
- `pt`

URL 结构：

```text
/blog/{locale}/{slug}
```

同一篇文章在不同语言下共用 slug，用 `hreflang` 互链。

## SEO / GEO

| 页面类型 | 目标 | 做法 |
| --- | --- | --- |
| 语言首页 `/blog/{locale}` | 浏览入口 + crawlable hub | 服务端渲染 featured / latest 卡片 |
| Guide 聚合页 `/guides/{topic}` | 传统 SEO | 静态聚合、内部链接、CollectionPage |
| 文章页 `/{slug}` | GEO / AI 搜索 | FAQ、Review、Speakable、决策型正文 |

每篇文章当前会输出：

- `BlogPosting`
- `BreadcrumbList`
- `FAQPage`
- `VideoGame`
- `Review`

同时带：

- canonical
- Open Graph
- Twitter Card
- locale alternates

## AI 相关文件

`content/templates/` 里有两套主要 prompt：

- `synthesis-prompt.md`
- `article-generation-prompt.md`

目前 prompt 已经约束：

- 主平台选择
- 其他版本回主站
- 不把内部分析术语直接泄露到成品正文

## 部署

- 站点地址：`https://www.gamegulf.com/blog`
- `base`：`/blog`
- GitHub Actions：
  - `npm ci`
  - `npm run build`
  - 部署 `dist/`

## 备注

如果看到本地构建对 `.astro` 内容缓存有异常，先清缓存再构建：

```bash
rm -rf .astro
npx astro build
```
