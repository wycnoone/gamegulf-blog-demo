# 工程层闭环（机检 + 占位符 + 构建）

本说明与 **各语言人工通读** 分离：这里只记录可重复运行的脚本、命令与「全绿」判据；不替代 [ARTICLE_REVIEW_PROGRESS.md](ARTICLE_REVIEW_PROGRESS.md) 中的人读台账。

## 范围

- **在范围内**：正文（frontmatter 以下 `---` 之后）中 `**>-**`、孤立成行 `>-` 等模板泄漏；`timeCommitment` 等 YAML 可解析；`priceRows` 与正文区域价表一致（经 `pricing:sync`）；`validate-article` 全量 PASS；`npm run build` 成功。
- **不在范围内**：措辞自然度、跨语言对照、HLTB 是否出现在正文中的编辑策略——属人读或内容政策，不由本闭环强制。

## 主要脚本

| 脚本 | 作用 |
|------|------|
| [`scripts/normalize-timecommitment-blocks.mjs`](../scripts/normalize-timecommitment-blocks.mjs) | 归一化 `timeCommitment` 折叠块（按需；幂等）。 |
| [`scripts/sync-price-tables.mjs`](../scripts/sync-price-tables.mjs) | 与 `priceRows` 对齐区域价表（`npm run pricing:sync`）。 |
| [`scripts/auto-fix-char-limits.mjs`](../scripts/auto-fix-char-limits.mjs) | 构建前字段长度裁剪（`npm run fix:limits`）。 |

历史上一批以 `fix-` 前缀命名的批处理脚本已从仓库移除；占位符/模板泄漏类问题改由**编辑 + `validate-article`** 收敛，不再依赖已删脚本。

## 建议复跑顺序

1. 按需：`node scripts/normalize-timecommitment-blocks.mjs`（YAML 异常时）。
2. `node scripts/validate-article.mjs --all`（或 `npm run validate:all`）→ 须 **0 FAIL**。
3. `npm run build`（含 prebuild：`pricing:sync` + `fix:limits`）→ **exit 0**。

## 正文审计（自助）

仅统计 **正文** 时，应对每个 `.md` 在第二个 `---` 之后取字符串再 grep，避免将 frontmatter 里合法的 `>-\` YAML 误计为泄漏。

- 不得出现子串 `**>-**`。
- 不得出现仅由空白 + `>-` 构成的**单独一行**（与模板泄漏常见形态一致；若将来有例外，在本文件「例外」节白名单化）。

## 与基线文档的关系

数值化结果（日期、FAIL 数、构建页数）以 [ARTICLE_REVIEW_BASELINE.md](ARTICLE_REVIEW_BASELINE.md) 为准；本页不重复逐条数字，只说明**怎么收口**与**和人工的边界**。
