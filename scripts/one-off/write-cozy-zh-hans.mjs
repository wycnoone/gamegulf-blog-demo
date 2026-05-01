import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** No backticks inside template — Node cannot parse nested ` in YAML/body literals. */

const ym = String.raw`---
title: "《和睦森林》（Cozy Grove）2026 年在 Nintendo Switch 上还值得买吗？"
description: >-
  结合 2026 年任天堂 eShop 多区比价与 GameGulf 存档的折扣 / 历史低谷记录，判断是否现在入手「每日打卡型」灵异营地模拟《和睦森林》。
publishedAt: "2026-04-30"
updatedAt: "2026-04-30"
category: worth-it
gameTitle: 《和睦森林》
platform: Nintendo Switch
author: GameGulf Editorial AI
readingTime: 8 分钟阅读
decision: >-
  《和睦森林》符合 Metacritic 约 71 分的疗愈定位，但很多区服现价仍明显高于指数化成交均价——除非你的帐号已踩在日服或美服红标档位，否则优先盯价再买。
priceSignal: >-
  Switch 1 追踪到近一年内 7 次折扣脉搏，成交均价约 €5.24；日服现货约 €7.99；美服 33%
  折价行约 €8.55；日本在 2026-03-25 附近曾出现更低的趋势低点≈€3.94。
heroStat: Metacritic 约 71 分
heroNote: >-
  手绘营地、现实时间同步的长期节奏；评论家整体偏疗愈，中后期「跑腿感」在社区里见仁见智。
badge: 等打折
verdict: wait_for_sale
priceCall: wait
confidence: medium
actionBucket: wait
featuredPriority: 1
listingTakeaway: >-
  氛围够，《和睦森林》也要先比价：现价常高于存档里的折扣均价。
whatItIs: >-
  手绘灵异营地 × 日常同步：鬼魂任务、钓鱼、工作台装饰——剧情被拆成长月章节。
bestFor: 喜欢睡前十几分钟的固定仪式、而不是周末一口气通关的人。
avoidIf: 「每日上限」一上来就让你觉得被卡脖子，最好别硬氪耐心。
consensusPraise: 笔触温柔、鬼魂故事有耐心时读起来最舒服。
mainFriction: 中后期若新鲜感掉得快，跑腿感会像《动森》换季那样磨人。
timeFit: 设计上是「按周按月」拉长；若想追完剧情线大约有 ~40 小时量级。
fitLabel: 更看重日常仪式感而非冲榜、爆肝爽游的人更适合。
timingNote: 先让 GameGulf 的历史曲线帮你判断，再在 eShop 点购买。
communityVibe: 再点亮一盏灯笼，鬼魂今晚就不闹了。
playtime: 约40h主线向任务量 · 真玩起来往往拆成数月
reviewSignal: Metacritic 约 71 分
takeaway: >-
  《和睦森林》卖的是疗愈与鬼魂故事；买不买先看 GameGulf 里你的区服算不算「折价舒服价」。
playStyle: 鬼魂跑腿、短途钓鱼、工作台改装、篝火装饰升级营地。
timeCommitment: 设计成「细水长流」，不是一两天肝穿所有节点。
playMode: 单人离线、按鬼魂任务推进的长期打卡节奏——没有组队副本。
whyNow: >-
  打折次数不少，但多数时间现价仍粘在高于指数化成交均价的档位上。
currentDeal: >-
  比价索引里仍是日本行最便宜；美国行有较深的 33% 红标可参考简报。
nearHistoricalLow: >-
  GameGulf 记载的日服趋势低谷约 €3.94（2026-03-25），比现在约 €7.99 的常见行更凉快。
salePattern: >-
  过去一年捕捉到 7 段折扣脉搏；一旦出现红标价，成交均价往往压在 €5.24 附近。
priceRecommendation: wait
quickFilters:
  - short_sessions
  - great_on_sale
playerNeeds:
  - cozy
  - casual
  - wait_for_sale
tags:
  - 和睦森林 Switch 值得买
  - cozy grove Switch 比价
  - 和睦森林 任天堂打折
playerVoices:
  - quote: 睡前十五分钟收个营地，有点像给脑子关机。
    sentiment: positive
  - quote: >-
      鬼魂故事摊开慢，我反而愿意隔天再来，不贪一口吃完。
    sentiment: positive
  - quote: 每日解锁上限让我想起加班清单，会有点烦。
    sentiment: negative
communityMemes:
  - 先收柴火再睡
  - 鬼魂布置像宜家
  - 跑腿税交一下
  - 睡前十五分钟仪式
  - 小岛慢慢来
  - 拆成月度打卡
tldr: >-
  《和睦森林》拿得住 Metacritic 约71分的疗愈牌，但以 GameGulf 成交均价与更低的日服记录衡量，现价很多时候仍适合先打折提醒再上。
wishlistHref: https://www.gamegulf.com/wishlist
priceTrackHref: https://www.gamegulf.com/detail/1ZWE4WIpTp5#currency-price
gameHref: https://www.gamegulf.com/detail/1ZWE4WIpTp5
membershipHref: https://www.gamegulf.com/pricing
coverImage: >-
  https://cdn.gamegulf.com/upload/NintendoSwitch/2026/4/2/177513498997210267.jpeg
heroTheme: brand
faq:
  - question: "《和睦森林》（Cozy Grove）2026 年在 Nintendo Switch 上还值得下手吗？"
    answer: >-
      《和睦森林》要不要现在买取决于你的帐号行是否与 GameGulf 追踪到的折价节奏重合：欧区 €13.99
      一类的原价行除非正好碰到红标，否则更适合先降价提醒。
  - question: "《和睦森林》在 Switch 上大概要投入多长时间？"
    answer: >-
      《和睦森林》把体量拆成按月打卡；若之灵任务持续推进，剧情向内容大约可达 ~40 小时量级，但更常见的是细水长流几个月。
  - question: "《和睦森林》在 Nintendo Switch 上运行表现怎么样？"
    answer: >-
      《和睦森林》偏手绘插画与 UI——Switch 跑得稳；社区讨论更多是清单与背包管理，而非掉帧硬伤。
  - question: "要不要等 Nintendo eShop 打折再买《和睦森林》?"
    answer: >-
      《和睦森林》大多数时候值得等一下：存档里折价成交均价大致 €5.24，日本在 2026-03-25 附近有更深的趋势低谷≈€3.94。下单前请先对照你自己的区服现价是否与「gamegulf.com/detail/1ZWE4WIpTp5」里同步。
  - question: "我想长期盯各区《和睦森林》价格，有更省事的入口吗？"
    answer: >-
      《和睦森林》建议你把它塞进 GameGulf 的区域面板：比价、存档折扣与提醒一次做完，比在几个 eShop Tab 来回跳更省事。
`;

const md = String.raw`

## 简明结论

**《和睦森林》**顶着 **Metacritic 约 71 分**的疗愈人设，若以 Switch 比价页回看 **存档折扣**，一年内 **sale**脉搏约「七次」、折算后的 **成交均价**大概在 **€5.24**，而这类 **discount**记录里还能看到 **historical low**：**日本区 2026-03-25 前后**曾一度探到 **历史低价**附近的 ≈ **€3.94**。如今常见日本行现价约 **€7.99**、美国区（约 33% 折价）常在 **€8.55**，请先点开 **[GameGulf 比价页](https://www.gamegulf.com/detail/1ZWE4WIpTp5#currency-price)** 对照你的帐号区服，再给 **gamegulf**账本写结论。

如果你在 **Euro €13.99**一类的货架上打转，却仍看不到红标——别急着上头，改用 **[GameGulf 明细](https://www.gamegulf.com/detail/1ZWE4WIpTp5)**把「体感便宜」转成「表格便宜」，《和睦森林》才不容易买成冤枉钱。

## 《和睦森林》在 Nintendo Switch 上大概要花多少钱？

现实观感：现价通常仍卡在 **成交均价**往上一点；真正出现 **sale** / **打折** 的时候，体感才更接近「买得服气」。这也是为什么 **discount**讨论比Steam一句话台词更有份量：**GameGulf**把时间轴和价格一起摊开——别把「疗愈」三个字当成免比价券。

## 这是一款什么样的游戏？

**现实时间同步的灵媒露营：**你每天收一点之灵任务，钓鱼、工作台和装饰会慢慢把海岛从灰白拉回彩色；商店文案写明 **40+ 小时量级**但更强调「拆成几个月」。它比纯挂机多了 **鬼魂剧情树**与营地升级钩子，也不像动作爽游那样靠连招吃饭——气质上也挨近轻松的 **动物森友会式**种田节奏——只是鬼魂任务线更「灵异」一点点。

Roguelike 那种「今晚必须打通」不适用：每日任务上限与时间锁本就是设计。**喜欢一气呵成**的人会在这里被节奏磨到耐性。

## 《和睦森林》在 Nintendo Switch 上跑得怎样？

整体仍属 **插画向轻负载**：**常见玩家表述**更多是清单密、背包切来切去顺手不顺手，而非疯狂掉帧。**掌机**：睡前十五分钟最舒服；**底座模式**不会让你突然变成 60fps战神，但能减少小屏清点菜单的局促。

如果你讨厌嵌套工作台弹窗，它比画面糊更影响体验——这跟硬件规格无关，纯粹是 UX 耐性。

## 现在就买，如果你——

- 你在 **gamegulf.com/detail/1ZWE4WIpTp5**看到自己的行已经踩在 **Japan ≈ €7.99**档位，或者是 **United States折扣行 ≈ €8.55**，并且能接受「睡前收一下」的长期合同。
- **Metacritic 约 71分**对你来说代表「疗愈与剧情」优先级高于「操作上限」；
-你愿意把 **之灵任务上限**视作节奏而非 bug；

## 先等等如果你——

- 你的 **Euro**货架还钉在 **€13.49–€13.99**，而存档 **sale均价**却仍指向 **€5.24那一带；
-你曾经因为 **跑腿任务**在早期就弃坑《动森》式沙盒；
-你只想要「本周爽完」的剧情密度——《和睦森林》注定要拆月；
- 你会用 **[降价提醒](https://www.gamegulf.com/wishlist)** ：让 **GameGulf**替你盯下一轮 **discount**，别自己脑补最低价。

## 一句话收尾

**《和睦森林》**仍是那种「晚上收一下就睡」的电子热水袋，但真正决定何时付款的是 **indexed价格**：
把 **gamegulf.com/detail/1ZWE4WIpTp5**加到书签，盯住 **折价**与时间轴对齐你的钱包节奏；当 **gamegulf**提醒你「这次红标配得上你的仪式感」再战 eShop，《和睦森林》才不只是在卖治愈而已。
`;

const OUT = resolve('src/content/posts/zh-hans/cozy-grove-worth-it.md');
writeFileSync(OUT, `${ym}---${md}\n`, 'utf8');
console.error('Wrote', OUT);
