# GameGulf Blog - 自动修复系统文档

## 📋 问题根源分析

### 问题分类

| 问题类型 | 影响范围 | 根本原因 | 解决方案 |
|---------|---------|---------|---------|
| 价格表格不匹配 | 5 个语言 | 验证器用实时汇率 vs 模型手写数值 | 后处理脚本自动生成 |
| 字符限制超出 | 4 个语言 | 模型翻译时难以精确控制字符数 | CSS 放宽 + 自动截断脚本 |
| 折扣历史分析缺失 | 2 个语言 | 提示词未明确验证器术语要求 | 更新提示词添加关键词列表 |
| 区域名称本地化 | 德语 | 验证器用 Intl API vs 模型直译 | 统一区域名称映射表 |

### 责任归属

- **代码设计缺陷**: 40% (价格表格、区域名称映射)
- **提示词不完善**: 20% (折扣历史关键词)
- **模型能力局限**: 40% (字符限制控制)

---

## 🔧 已实施修复

### 短期修复（已完成）

#### 1. 更新提示词 (`content/templates/synthesis-prompt.md`)

**添加了折扣历史关键词列表：**
```markdown
CRITICAL: Include at least 2 discount history keywords:
- English: "all-time low", "historical low", "discount", "sale"
- 中文："历史低价", "历史最低", "折扣", "打折"
- 日语："最安値", "セール", "割引"
- 德语："historischer tiefstpreis", "rabatt", "sale"
- 西班牙语："mínimo histórico", "oferta", "descuento"
- 法语："plus bas historique", "promo", "remise"
- 葡萄牙语："menor preço histórico", "promoção", "desconto"
```

**添加了区域名称映射表：**
```markdown
- cardPriceRegion: localized name of the global low region
  Use these exact mappings:
  - Hong Kong → "Hong Kong" (en/zh-hans/ja), "Hongkong" (de), "Hong Kong" (fr/es/pt)
  - Japan → "Japan" (en), "日本" (zh-hans/ja), "Japon" (fr/es/pt)
  - ...
```

#### 2. 统一区域名称映射 (`scripts/article-pricing-utils.mjs`)

**扩展了 `REGION_OVERRIDES`：**
```javascript
const REGION_OVERRIDES = {
  'zh-hans': { 
    HK: '香港', GB: '英国', US: '美国', 
    JP: '日本', BR: '巴西', DE: '德国'
  },
  ja: { 
    HK: '香港', GB: 'イギリス', US: 'アメリカ合衆国',
    JP: '日本', BR: 'ブラジル', DE: 'ドイツ'
  },
  de: { 
    HK: 'Hongkong', GB: 'Vereinigtes Königreich',
    US: 'Vereinigte Staaten', JP: 'Japan',
    BR: 'Brasilien', DE: 'Deutschland'
  },
  // ...
};
```

**新增导出 `REGION_NAME_MAPPING`：**
```javascript
export const REGION_NAME_MAPPING = {
  HK: {
    en: 'Hong Kong', 'zh-hans': '香港', ja: '香港',
    fr: 'Hong Kong', es: 'Hong Kong', de: 'Hongkong', pt: 'Hong Kong'
  },
  // ...
};
```

---

### 中期修复（已完成）

#### 3. 价格表格后处理脚本 (`scripts/sync-price-tables.mjs`)

**功能：**
- 从 frontmatter 的 `priceRows` 读取数据
- 使用验证器相同的汇率计算函数
- 自动生成 locale-adaptive 价格表格
- 替换或插入到文章 body 的正确位置

**使用：**
```bash
# 处理所有文章
node scripts/sync-price-tables.mjs

# 处理指定文件
node scripts/sync-price-tables.mjs src/content/posts/ja/*.md
```

**示例输出：**
```
✓ src/content/posts/de/13-sentinels-aegis-rim-worth-it.md
✓ src/content/posts/en/13-sentinels-aegis-rim-worth-it.md
...
Done. Updated 7 files, 0 errors.
```

#### 4. 字符限制自动修复脚本 (`scripts/auto-fix-char-limits.mjs`)

**功能：**
- 检查所有文章的字符限制
- 自动截断超出 HARD 限制的字段
- 智能在单词边界截断
- SOFT 限制仅警告不截断（CSS 处理）

**字符限制配置：**
```javascript
const CHAR_LIMITS = {
  // HARD limits - 自动截断
  whatItIs: 90,
  bestFor: 60,
  avoidIf: 72,
  consensusPraise: 82,
  mainFriction: 84,
  timeFit: 82,
  fitLabel: 72,
  tldr: 160,
  // SOFT limits - CSS 处理
  listingTakeaway: 96,
  communityVibe: 64,
};
```

**使用：**
```bash
# 修复所有文章
node scripts/auto-fix-char-limits.mjs

# 修复指定文件
node scripts/auto-fix-char-limits.mjs src/content/posts/ja/*.md
```

**示例输出：**
```
✓ /tmp/test-article.md (whatItIs: 197→88, bestFor: 69→59, tldr: 198→159)
Done. Fixed 1 files, 0 soft limit warnings.
```

---

### CSS 调整（已完成）

#### 5. 放宽显示限制 (`src/styles/globals.css`)

**修改前：**
```css
.decision-summary-pro {
  -webkit-line-clamp: 3;
  overflow: hidden;
}
```

**修改后：**
```css
.decision-summary-pro {
  -webkit-line-clamp: 4;  /* 从 3 行放宽到 4 行 */
  overflow: hidden;
  /* Relaxed from 3 to 4 lines to accommodate longer translations */
}

.decision-core-value-pro {
  -webkit-line-clamp: 4;  /* 从 3 行放宽到 4 行 */
  overflow: hidden;
  /* Relaxed from 3 to 4 lines for longer translations */
}

/* listingTakeaway 和 communityVibe 允许自动高度 */
.decision-core-value-pro[data-field="listingTakeaway"],
.decision-core-value-pro[data-field="communityVibe"] {
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
}
```

---

## 📦 构建流程集成

### package.json 更新

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "pricing:sync": "node scripts/sync-price-tables.mjs",
    "fix:limits": "node scripts/auto-fix-char-limits.mjs",
    "validate:all": "node scripts/validate-article.mjs src/content/posts/*/*.md",
    "prebuild": "npm run pricing:sync && npm run fix:limits"
  }
}
```

**构建流程：**
```
npm run build
  ↓
prebuild hook
  ↓
1. pricing:sync (同步价格表格)
  ↓
2. fix:limits (修复字符限制)
  ↓
astro build (构建站点)
```

---

## ✅ 验证结果

### 13 Sentinels 文章（7 个语言）

```bash
node scripts/validate-article.mjs src/content/posts/*/13-sentinels-aegis-rim-worth-it.md
```

**结果：**
```
✓ de/13-sentinels-aegis-rim-worth-it.md - PASS
✓ en/13-sentinels-aegis-rim-worth-it.md - PASS
✓ es/13-sentinels-aegis-rim-worth-it.md - PASS
✓ fr/13-sentinels-aegis-rim-worth-it.md - PASS
✓ ja/13-sentinels-aegis-rim-worth-it.md - PASS
✓ pt/13-sentinels-aegis-rim-worth-it.md - PASS
✓ zh-hans/13-sentinels-aegis-rim-worth-it.md - PASS

All 7 files passed validation!
```

### 构建结果

```
[build] 146 page(s) built in 3.19s
[build] Complete!
```

---

## 🎯 效果对比

### 修复前

| 语言 | 验证错误数 | 主要问题 |
|------|----------|---------|
| 日语 | 3 | 价格表格、cardPrice、折扣历史 |
| 德语 | 7 | 字符限制、价格表格、区域名称 |
| 西班牙语 | 8 | 字符限制、价格表格 |
| 葡萄牙语 | 8 | 字符限制、价格表格 |
| 法语 | 2 | 字符限制 |
| **总计** | **28** | - |

### 修复后

| 语言 | 验证错误数 | 状态 |
|------|----------|------|
| 日语 | 0 | ✅ PASS |
| 德语 | 0 | ✅ PASS |
| 西班牙语 | 0 | ✅ PASS |
| 葡萄牙语 | 0 | ✅ PASS |
| 法语 | 0 | ✅ PASS |
| 英语 | 0 | ✅ PASS |
| 中文 | 0 | ✅ PASS |
| **总计** | **0** | **全部通过** |

---

## 📝 维护指南

### 新增语言

1. 在 `article-pricing-utils.mjs` 中添加：
   - `REGION_OVERRIDES` 区域名称映射
   - `PRICE_TABLE_HEADERS` 表格头翻译
   - `DISCOUNT_HISTORY_TERMS` 折扣关键词

2. 在 `synthesis-prompt.md` 中添加：
   - 区域名称映射示例
   - 折扣历史关键词

### 新增字段

1. 在 `auto-fix-char-limits.mjs` 中添加：
   - `CHAR_LIMITS` 字符限制
   - 分类为 HARD 或 SOFT

2. 在 `globals.css` 中添加对应样式

### 汇率更新

验证器使用 `getEurExchangeRates()` 获取实时汇率，如需固定汇率：

```javascript
// article-pricing-utils.mjs
export const FALLBACK_EUR_RATES = {
  EUR: 1,
  USD: 1.1525,
  CNY: 7.9495,
  JPY: 183.94,
  // 更新这里的汇率
};
```

---

## 🚀 未来优化建议

1. **固定汇率快照** - 避免验证器使用实时汇率导致的不一致
2. **AI 工具调用** - 让模型可以调用字符计数和汇率转换工具
3. **CI/CD 集成** - 在 GitHub Actions 中自动运行验证
4. **可视化报告** - 生成验证错误的可视化报告

---

_Last updated: 2026-04-06_
