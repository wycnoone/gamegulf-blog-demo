# Sprint：`en/` 首批推进（机读 + 占位符修复）

**开始日期**：2026-04-26  
**范围**：全库 `src/content/posts/**/*.md`（以本 sprint 触发的修复为准，不限于仅 `en/`）。

## 本 sprint 已完成

1. **人工通读启动**：按 [ARTICLE_REVIEW_BATCHES.md](ARTICLE_REVIEW_BATCHES.md) 从 `en/` 推进；首批抽样发现系统性正文占位符 `>-` 与部分 frontmatter 中 **HLTB 命名** 违反 [AGENTS.md](../AGENTS.md)。
2. **批量修复脚本**（曾用于本 sprint；其中 `fix-*` 批处理已从仓库移除，仅作记录）  
   - 正文 `>-` / `**>-**` 占位与 YAML 中 HLTB 字面量等：历史上由已删 `fix-body-gt-dash-placeholders` 等脚本处理；后续改走编辑与机检。  
   - [`scripts/normalize-timecommitment-blocks.mjs`](../scripts/normalize-timecommitment-blocks.mjs)：统一 `timeCommitment: >-` 折叠块缩进，消除 YAML parse error（仍保留）。
3. **机检**：当前 `node scripts/validate-article.mjs --all` **0 FAIL**。

## 子分块 `en` A–F 试点（2026-04-26）

- **分块规则**：与 [ARTICLE_REVIEW_PROGRESS.md](ARTICLE_REVIEW_PROGRESS.md) 一致，slug 首字 ∈ `0-9` 或 `a`–`f`；**49 篇**。
- **机检**：`node scripts/list-human-read-batch.mjs --validate en AF` → 全 **PASS**（本批中曾修复 `en/13-sentinels-aegis-rim-worth-it.md` 的 `playerVoices` / `faq` / `priceRows` 缩进与 `href` 标量，并 `pricing:sync` 价表与正文区对齐）。
- **AI/定向修**：仅可模式化项；不代替全文风格审读。
- **人读/抽检**（本批内约 **5/49 ≈10%**）：`13-sentinels`（随修复完成）、`a-short-hike-worth-it`、`balatro-worth-it`、`cuphead-worth-it`、`dave-the-diver-worth-it` 已对照 [ARTICLE_REVIEW_CHECKLIST.md](ARTICLE_REVIEW_CHECKLIST.md) **B–C** 条快速核对；**其余 44 篇**仍须在后续排期中按同清单过稿或在更大抽检策略下补完。
- **子分块脚本**：[`scripts/list-human-read-batch.mjs`](../scripts/list-human-read-batch.mjs)。

## 子分块 `en` G–M、N–S、T–Z（2026-04-26）

- **G–M**：**38 篇**；`node scripts/list-human-read-batch.mjs --validate en GM` → 全 **PASS**。
- **N–S**：**56 篇**；`node scripts/list-human-read-batch.mjs --validate en NS` → 全 **PASS**。
- **T–Z**：**29 篇**；`node scripts/list-human-read-batch.mjs --validate en TZ` → 全 **PASS**。

与 A–F 相同，**5–10% 清单 B–C 抽检**与母语气**清单 D** 可继续按业务排期补；机检子分块与全库 `validate --all` 已合卷（见 [ARTICLE_REVIEW_PROGRESS.md](ARTICLE_REVIEW_PROGRESS.md)「本关合卷」）。

## 回归命令

```bash
node scripts/validate-article.mjs --all
npm run build
```
