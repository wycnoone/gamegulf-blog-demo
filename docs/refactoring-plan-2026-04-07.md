# 🎮 GameGulf 游戏文章规范化重构计划

**制定时间：** 2026-04-07 00:30  
**负责人：** 老贾  
**状态：** 待审核

---

## 📊 当前状态评估

### 游戏覆盖统计

| 状态 | 游戏数量 | 游戏名称 |
|------|---------|---------|
| ✅ 完整 7 语言 | 11 款 | 13 Sentinels, Animal Crossing, Figment, Hades, INSIDE, Mario Kart 8, Metroid Dread, Persona 5 Royal, Pikmin 4, Super Mario Bros Wonder, Zelda TOTK |
| ❌ 仅 2 语言 | 2 款 | Ori and the Will of the Wisps, Tetris Effect: Connected |

### 规范符合度（英文版抽样）

| 游戏 | 验证状态 | 主要问题 |
|------|---------|---------|
| 13 Sentinels | ✅ PASS | - |
| Ori | ✅ PASS | - |
| Figment | ❌ FAIL | 价格表格、字符限制 |
| Hades | ❌ FAIL | 价格表格、折扣历史分析 |
| Persona 5 Royal | ❌ FAIL | 价格表格、区域名称 |
| Tetris Effect | ❌ FAIL | 价格表格、字符限制 |

**结论：** 即使有 7 个语言版本，大部分旧文章也不符合新规范。

---

## 🎯 重构目标

### 必须完成的规范（HARD 要求）

1. **7 语言覆盖** - en, zh-hans, ja, fr, es, de, pt
2. **价格表格正确** - 使用 `priceRows` + `sync-price-tables.mjs` 自动生成
3. **字符限制合规** - 自动截断脚本处理
4. **折扣历史分析** - 包含至少 2 个关键词 + 具体数据
5. **区域名称本地化** - 使用统一映射表
6. **排除阿根廷** - 任何地方不出现 AR 区

### 可选优化（SOFT 要求）

1. **队列同步** - 自动添加到 `game-queue.json`
2. **验证通过** - `node scripts/validate-article.mjs` 全部 PASS
3. **构建成功** - `npm run build` 无错误

---

## 📋 执行计划

### Phase 1：补充缺失语言（优先级：高）

**目标游戏：** 2 款
- Ori and the Will of the Wisps (9t3j1FNGEAF)
- Tetris Effect: Connected (6Rq3jqh8KUa)

**任务：**
1. 生成 ja, fr, es, de, pt 五个语言版本
2. 运行验证器
3. 修复错误
4. 构建测试

**预计时间：** 30 分钟  
**执行方式：** 单会话顺序执行（确保质量）

---

### Phase 2：修复旧文章规范（优先级：中）

**目标游戏：** 4 款（抽样验证失败的）
- Figment
- Hades
- Persona 5 Royal
- 其他验证失败的游戏

**任务：**
1. 运行 `sync-price-tables.mjs` 修复价格表格
2. 运行 `auto-fix-char-limits.mjs` 修复字符限制
3. 手动添加折扣历史分析（如缺失）
4. 验证通过

**预计时间：** 1 小时  
**执行方式：** 多会话并发执行（每款游戏一个会话）

---

### Phase 3：全面验证（优先级：低）

**目标：** 所有 13 款游戏

**任务：**
1. 运行完整验证：`node scripts/validate-article.mjs src/content/posts/*/*.md`
2. 生成验证报告
3. 修复剩余问题
4. 最终构建测试

**预计时间：** 30 分钟  
**执行方式：** 单会话执行

---

## 🚀 执行策略

### 会话管理

```bash
# Phase 1: 单会话
sessions_spawn --mode session --label "phase1-ori-tetris"

# Phase 2: 多会话并发
sessions_spawn --mode session --label "phase2-figment"
sessions_spawn --mode session --label "phase2-hades"
sessions_spawn --mode session --label "phase2-persona5"

# Phase 3: 单会话
sessions_spawn --mode session --label "phase3-validation"
```

### 并发控制

- **Phase 1:** 1 个会话（顺序执行，保证质量）
- **Phase 2:** 3-4 个会话（并发执行，提升效率）
- **Phase 3:** 1 个会话（顺序执行，汇总报告）

**最大并发数：** 4 个会话  
**资源监控：** 每 10 分钟检查会话状态

---

## 📝 检查清单

### 每款游戏必须通过

- [ ] 7 个语言版本存在
- [ ] 验证器 PASS（无 ERROR）
- [ ] 价格表格正确（与 priceRows 匹配）
- [ ] 字符限制合规（HARD 字段不超标）
- [ ] 折扣历史分析完整（≥2 个关键词）
- [ ] 无阿根廷区域引用
- [ ] 构建成功

### 队列同步

- [ ] `game-queue.json` 包含所有游戏
- [ ] 状态正确（done/in_progress/pending）
- [ ] 无重复条目

---

## 📊 交付物

### 审核报告

**内容：**
1. 执行摘要（完成的游戏数量、通过率）
2. 问题汇总（验证错误类型及修复情况）
3. 性能统计（构建时间、页面数量）
4. 待优化项（如有）

**格式：** Markdown 文档  
**位置：** `docs/refactoring-report-2026-04-07.md`

### 验证报告

**生成命令：**
```bash
node scripts/validate-article.mjs src/content/posts/*/*.md > docs/validation-report.json
```

**内容：** 每款游戏的验证结果（PASS/FAIL + 错误详情）

---

## ⏱️ 时间预估

| Phase | 预计时间 | 最坏情况 |
|-------|---------|---------|
| Phase 1 | 30 分钟 | 1 小时 |
| Phase 2 | 1 小时 | 2 小时 |
| Phase 3 | 30 分钟 | 1 小时 |
| **总计** | **2 小时** | **4 小时** |

---

## ⚠️ 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 验证器误报 | 低 | 中 | 人工复核错误信息 |
| 并发会话冲突 | 中 | 低 | 限制最大并发数 |
| 构建失败 | 低 | 高 | 每阶段完成后测试构建 |
| 数据丢失 | 极低 | 高 | 操作前备份关键文件 |

---

## 🎯 成功标准

1. **13 款游戏全部 7 语言覆盖**
2. **验证器 100% PASS**（无 ERROR）
3. **构建成功**（146+ 页面）
4. **队列完整**（13 个游戏记录）
5. **审核报告交付**

---

## 📋 等待审核

**请王董确认：**

1. ✅ 计划是否合理？
2. ✅ 优先级是否正确？
3. ✅ 是否需要调整并发策略？
4. ✅ 是否有额外要求？

**确认后老贾立即执行！** 🫡

---

_Last updated: 2026-04-07 00:30_
