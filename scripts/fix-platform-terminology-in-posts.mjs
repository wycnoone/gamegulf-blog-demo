#!/usr/bin/env node
/**
 * Normalize awkward platform wording across blog markdown (legacy + mixed AI output).
 *
 * Rules:
 * - "Nintendo Switch 1" / "Switch 1" → Switch (zh-hans) or Nintendo Switch (other locales)
 * - "Nintendo Switch 2" / "Switch 2" → NS2
 * - zh-hans: "数字行" → "数字版各区价格"；常见「行价」类机翻短语做轻量归一
 * - de: spreadsheet-y "Zeile(n)" + "Switch-1/2" compounds → natural Preis/Regionalpreis wording
 * - ja: Chinese-originated 「行」as price row → 価格／リージョンの価格 等
 * - es/fr/pt: "filas/lignes/linhas Switch" in GameGulf context → precios / grille / preços
 *
 * Does NOT change YAML machine keys (e.g. primaryPlatformKey: switch-1 / switch 1 lowercase).
 *
 * Usage: node scripts/fix-platform-terminology-in-posts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listAllBlogPostMarkdownPaths } from './article-pricing-utils.mjs';

/** German: "Zeile" as spreadsheet row reads unnatural — use Preis / Regionalpreis. */
function fixGermanRowWording(s) {
  return (
    s
      .replace(/\*\*Switch-1\*\*- und \*\*Switch-2\*\*-Zeilen/gi, 'Preise für **Nintendo Switch** und **NS2**')
      .replace(/\*\*Switch-1\*\*-Zeile/gi, '**Nintendo Switch**-Preis')
      .replace(/\*\*Switch-2\*\*-Zeile/gi, '**NS2**-Preis')
      .replace(/günstigste Switch-1-Zeile/gi, 'günstigste Region für Nintendo-Switch-Preise')
      .replace(/Switch-1-Zeilen/gi, 'Nintendo-Switch-Preise')
      .replace(/Switch-2-Zeilen/gi, 'NS2-Preise')
      .replace(/Switch-1-Zeile/gi, 'Nintendo-Switch-Preis')
      .replace(/Switch-2-Zeile/gi, 'NS2-Preis')
      .replace(/Switch-1-Tief/gi, 'Nintendo-Switch-Tiefstpreis')
      .replace(/darunter liegt die aktuelle Japan-Zeile nicht/gi, 'der aktuelle Japan-Preis liegt nicht darunter')
      .replace(/Fokus Switch-1-Zeilen/gi, 'Fokus auf Nintendo-Switch-Preise')
      .replace(/(^|[^\wäöüÄÖÜß-])Switch-Zeilen von/gm, '$1Nintendo-Switch-Preise von')
      .replace(/(^|[^\wäöüÄÖÜß-])Switch-Zeilen/gm, '$1Nintendo-Switch-Regionalpreise')
      .replace(/(^|[^\wäöüÄÖÜß-])Switch-Zeile/gm, '$1Nintendo-Switch-Preis')
      .replace(/GameGulf-April-2026-Zeilen/g, 'GameGulf-Preise vom April 2026')
      .replace(/GameGulf-Zeilen/g, 'GameGulf-Regionalpreise')
      .replace(/GameGulf-Zeile/g, 'GameGulf-Regionalpreis')
      .replace(/GameGulfs ([A-Za-zäöüÄÖÜß]+)-Zeile/g, 'GameGulfs $1-Preis')
      .replace(/eShop-Zeile/gi, 'eShop-Preis')
      .replace(/NS2-Zeilen/gi, 'NS2-Preise')
      .replace(/NS2-Zeile/gi, 'NS2-Preis')
      .replace(/Storefront-Zeile/gi, 'eShop-Preis')
      .replace(/Store-Zeile/gi, 'Store-Preis')
      .replace(/Tiefpreis-Zeile/gi, 'Tiefpreis-Region')
      .replace(/Euro-Shopzeilen/gi, 'Euro-eShop-Preise')
      .replace(/Live-Zeilen/gi, 'Live-Preise')
      .replace(/günstige Zeile triffst/g, 'günstige eShop-Region triffst')
      .replace(/günstige Zeile/g, 'günstige Region')
      .replace(/Japan-Zeile/g, 'Japan-Preis')
      .replace(/Brasilien-Zeile/g, 'Brasilien-Preis')
      .replace(/€-Zeile/g, '€-Preis')
      .replace(/\+-Switch-Zeilen/g, '+-Nintendo-Switch-Preisen')
      .replace(/Switch-1/gi, 'Nintendo Switch')
      .replace(/Switch-2/gi, 'NS2')
      .replace(/wenn die Zeile zum Plan passt/gi, 'wenn der Preis zum Plan passt')
      .replace(/bei Switch-Zeilen/gi, 'bei Nintendo-Switch-Preisen')
      .replace(/bleibt bei Switch-Zeilen/gi, 'bleibt bei Nintendo-Switch-Preisen')
      .replace(/die günstigster Nintendo-Switch-Preis/g, 'die Region mit dem günstigsten Nintendo-Switch-Preis')
      .replace(/GameGulfs getracktes Nintendo-Switch-Tiefstpreis war/g, 'GameGulfs getrackter Nintendo-Switch-Tiefstpreis lag')
      .replace(/Tiefstpreis lag €/g, 'Tiefstpreis lag bei €')
      .replace(/deine eShop-Preis/g, 'dein eShop-Preis')
  );
}

/** Japanese articles: literal 行 (price row) from MT — normalize to 価格 wording. */
function fixJapaneseRowLiteral(s) {
  return (
    s
      .replace(/先看清自己区服行价。/g, '購入前に自分のリージョンの価格を確認してください。')
      .replace(/GameGulf日本行（/g, 'GameGulfの日本価格（')
      .replace(/GameGulfでSwitch日本行が/g, 'GameGulfでSwitchの日本価格が')
      .replace(/Switch日本行が/g, 'Switch（日本）の価格が')
      .replace(/Nintendo Switch日本行が/g, 'Nintendo Switch（日本）の価格が')
      .replace(/現在の日本行より/g, '現在の日本の価格より')
      .replace(/GameGulfの2026年4月22日日本行€/g, 'GameGulfの2026年4月22日時点の日本価格€')
      .replace(/好みの行が/g, '好みの価格帯が')
      .replace(/自分の行を/g, '自分のリージョンの価格を')
      .replace(/自分の行が/g, '自分のリージョンの価格が')
      .replace(/自分のアカウント行を/g, '自分のアカウントの価格を')
      .replace(/自分のアカウント行\*\*/g, '自分のアカウントの価格**')
      .replace(/自分のアカウント地域の行を/g, '自分のアカウント地域の価格を')
      .replace(/自アカウントの行を/g, '自アカウントの価格を')
      .replace(/自リージョンの行を/g, '自リージョンの価格を')
      .replace(/自リージョンの行が/g, '自リージョンの価格が')
      .replace(/自リージョン行\*\*が/g, '自リージョンの価格**が')
      .replace(/自地域の行を/g, '自地域の価格を')
      .replace(/一度だけ自リージョンの行を/g, '一度だけ自リージョンの価格を')
      .replace(/一度自地域の行を/g, '一度自地域の価格を')
      .replace(/自分のストア行が/g, '自分のストア価格が')
      .replace(/自分のストア行\*\*/g, '自分のストア価格**')
      .replace(/変数は自分のストア行が/g, '変数は自分のストア価格が')
      .replace(/店の行なら/g, '店の価格を重視するなら')
      .replace(/店の行。\*\*/g, '価格。**')
      .replace(/文化と店の行。\*\*/g, '文化と価格。**')
      .replace(/この行を/g, 'この価格を')
      .replace(/実際の行を/g, '実際の表示価格を')
      .replace(/2026年4月22日の行に/g, '2026年4月22日の価格帯に')
      .replace(/生の行を/g, 'リアルタイムの価格を')
      .replace(/同帯の行を/g, '同帯の価格を')
      .replace(/今の行で妥協/g, '今の価格で妥協')
      .replace(/今の行が/g, '今の価格が')
      .replace(/今の行が払えるか/g, '今の価格が払えるか')
      .replace(/米国の行が高止まり/g, '米国の価格が高止まり')
      .replace(/米国\*\*の行が/g, '米国**の価格が')
      .replace(/約€6\.50前後の行も記録/g, '約€6.50前後の価格も記録')
      .replace(/自分の地域行を/g, '自分の地域の価格を')
      .replace(/索引で自分の行が/g, '索引で自分のリージョンの価格が')
      .replace(/日服の安い行と自分のアカウント行を/g, '日服の安い価格と自分のアカウント表示を')
      .replace(/インデックス上の日本行が/g, 'インデックス上の日本の価格が')
      .replace(/日本行は追跡/g, '日本の価格は追跡')
      .replace(/\*\*日本行\*\*を/g, '**日本の価格**を')
      .replace(/日本行の \*\*/g, '日本の価格の **')
      .replace(/日本行の\*\*/g, '日本の価格の**')
      .replace(/価値の基準は日本行——/g, '価値の基準は日本の価格——')
      .replace(/最安値\*\*は日本行の/g, '最安値**は日本の価格の')
      .replace(/自通貨行と比べる/g, '自通貨の価格と比べる')
      .replace(/自分のアカウント行/g, '自分のアカウントの価格')
      .replace(/自分の アカウント地域の行を/g, '自分のアカウント地域の価格を')
      .replace(/（€42\.95相当）行。/g, '（€42.95相当）の価格帯。')
      .replace(/\*\*日本行\*\*/g, '**日本の価格**')
      .replace(/Nintendo Switch日本行€/g, 'Nintendo Switch（日本）の価格€')
      .replace(/Nintendo Switch日本行を/g, 'Nintendo Switchの日本価格を')
      .replace(/Nintendo Switch日本行/g, 'Nintendo Switch（日本）の価格')
      .replace(/Switch日本行を/g, 'Switchの日本価格を')
      .replace(/Switchの日本行が/g, 'Switchの日本価格が')
      .replace(/Nintendo Switchの日本行が/g, 'Nintendo Switchの日本価格が')
      .replace(/日本行が/g, '日本の価格が')
      .replace(/日本行に近い/g, '日本の価格に近い')
      .replace(/日本行が最安/g, '日本の価格が最安')
      .replace(/日本行を史低/g, '日本の価格を史低')
      .replace(/日本行も/g, '日本価格も')
      .replace(/の日本行と/g, 'の日本価格と')
      .replace(/前後の日本行と/g, '前後の日本価格と')
      .replace(/eShop行を日本行と/g, 'eShopの価格を日本価格と')
      .replace(/日本先行価格/g, '日本アンカーの価格')
      .replace(/1日本行€/g, '日本価格€')
      .replace(/1日本行が/g, '日本の価格が')
      .replace(/索引が日本行を/g, '索引が日本の価格を')
      .replace(/の日本行€/g, 'の日本価格€')
      .replace(/インデックス上の日本行から/g, 'インデックス上の日本価格から')
      .replace(/\*\*自分の行\*\*/g, '**自分のリージョンの価格**')
  );
}

function fixSpanishRowWording(s) {
  return s
    .replace(/filas Switch de abril/gi, 'precios regionales de Switch en abril')
    .replace(/filas Switch/gi, 'precios por región de Switch');
}

function fixFrenchRowWording(s) {
  return s
    .replace(/les lignes Switch d'avril/gi, 'les prix Switch par région en avril')
    .replace(/les lignes Switch/gi, 'les prix Switch par région');
}

function fixPortugueseRowWording(s) {
  return s
    .replace(/nas linhas Switch de abril/gi, 'nos preços da Nintendo Switch em abril')
    .replace(/nas linhas Switch/gi, 'nos preços da Nintendo Switch');
}

function fixContent(raw, relPath) {
  const norm = relPath.replace(/\\/g, '/');
  const isZhHans = norm.includes('/posts/zh-hans/');
  const isPt = norm.includes('/posts/pt/');
  const isDe = norm.includes('/posts/de/');
  const isJa = norm.includes('/posts/ja/');
  const isEs = norm.includes('/posts/es/');
  const isFr = norm.includes('/posts/fr/');
  let s = raw;

  if (isZhHans) {
    s = s.replace(/Switch 1 年/g, 'Switch 的一年');
    s = s.replace(/Switch 年趋势/g, 'Switch 的一年趋势');
    s = s.replace(/Nintendo Switch 1/g, 'Switch');
    s = s.replace(/Nintendo Switch 2/g, 'NS2');
    s = s.replace(/\bSwitch 2\b/g, 'NS2');
    s = s.replace(/\bSwitch 1\b/g, 'Switch');
    s = s.replace(/数字行/g, '数字版各区价格');
    s = s.replace(/全球低价行/g, '全球低价区服');
    s = s.replace(/对行再付账/g, '对照各区价格再下单');
    s = s.replace(/实时行价/g, '各区实时价格');
    s = s.replace(/心仪行价/g, '心仪价位');
    s = s.replace(/区服行价/g, '区服价格');
    s = s.replace(/行价对齐/g, '价格对齐');
    s = s.replace(/\*\*Switch\*\*\s*行/g, '**Switch** 各区价格');
    s = s.replace(/\*\*NS2\*\*\s*行/g, '**NS2** 各区价格');
    s = s.replace(/与\s*\*\*NS2\*\*\s*行/g, '与 **NS2** 版本');
    s = s.replace(/折扣行/g, '折扣档位');
    s = s.replace(/另有折扣行/g, '另有折扣力度');
    s = s.replace(/\n\s*行；否则/g, '\n      这一档；否则');
    s = s.replace(/Switch 行为主/g, 'Switch 版为主');
    s = s.replace(/以 以 Switch 版为主/g, '以 Switch 版为主');
    s = s.replace(/哪区行价/g, '哪区价格');
    s = s.replace(/今日日本行/g, '今日日本区价');
    s = s.replace(/(€[\d.]+) 行，/g, '$1 参考价，');
    s = s.replace(/最便宜的 Switch 行/g, '当前最便宜的 Switch 区服');
    s = s.replace(/\*\*GameGulf\*\* 行价/g, '**GameGulf** 各区标价');
    s = s.replace(/\*\*日本\*\* \*\*Switch\*\* 各区价格/g, '**日本区** 的 **Switch** 这一档价格');
    s = s.replace(/primaryPlatformLabel: Nintendo Switch/g, 'primaryPlatformLabel: Switch');
    s = s.replace(/在 Nintendo Switch 上现在/g, '在 Switch 上现在');
    s = s.replace(/还值得在 Nintendo Switch 上买/g, '还值得在 Switch 上买');
    s = s.replace(/Nintendo Switch 购买指南/g, 'Switch 购买指南');
    s = s.replace(/——Nintendo Switch /g, '——Switch ');
    s = s.replace(/GameGulf 行价/g, 'GameGulf 参考价');
    s = s.replace(/GameGulf[\s\n]+行价/g, 'GameGulf 参考价');
    s = s.replace(/本区行价/g, '本区价格');
    s = s.replace(/(\d+\s*月)的行价/g, '$1的价格');
    s = s.replace(/各区行价/g, '各区价格');
    s = s.replace(/多区行价/g, '多区价格');
    s = s.replace(/其他平台行价/g, '其他平台价格');
    s = s.replace(/低价行/g, '低价区服');
    s = s.replace(/eShop 行价/g, 'eShop 标价');
    s = s.replace(/你的 eShop 行价/g, '你的 eShop 标价');
    s = s.replace(/账号行价/g, '账号价格');
    s = s.replace(/确认一行价/g, '确认自己的价格');
    s = s.replace(/那一行价/g, '那一档价格');
    s = s.replace(/你区行价/g, '你区价格');
    s = s.replace(/看一眼行价/g, '看一眼价格');
    s = s.replace(/把你的行价对照/g, '把你的价格对照');
    s = s.replace(/行价舒服/g, '价格舒服');
    s = s.replace(/贴近 \*\*日本行\*\*/g, '贴近 **日本区**');
    s = s.replace(/哪一档行价/g, '哪一档价格');
    s = s.replace(/行价回答/g, '价格回答');
    s = s.replace(/再在行价匹配/g, '再在价格匹配');
    s = s.replace(/行价配合/g, '价格配合');
    s = s.replace(/这行价格/g, '这一价格');
    s = s.replace(/eShop 行价与日本行及/g, 'eShop 标价与日本区及');
    s = s.replace(/你当前行价是否/g, '你当前标价是否');
    s = s.replace(/请先对照本区行价/g, '请先对照本区价格');
    s = s.replace(/Mixed — compare the live cheapest row to the tracked average\./g, '较复杂——请在 GameGulf 对照当前最低价与追踪均价。');
    s = s.replace(/Mixed — compare the live cheapest listing to the tracked average\./g, '较复杂——请在 GameGulf 对照当前最低价与追踪均价。');
    s = s.replace(/若你的行价/g, '若你看到的参考价');
    s = s.replace(/上看到的行价/g, '上看到的参考价');
    s = s.replace(/用 GameGulf 行价/g, '用 GameGulf 参考价');
    s = s.replace(/在 Nintendo Switch 上跑得/g, '在 Switch 上跑得');
    s = s.replace(/核对实时行([。；])/g, '核对商店实时价$1');
  } else {
    s = s.replace(/Nintendo Switch 1/g, 'Nintendo Switch');
    s = s.replace(/Nintendo Switch 2/g, 'NS2');
    s = s.replace(/\bSwitch 2\b/g, 'NS2');
    s = s.replace(/\bSwitch 1\b/g, 'Nintendo Switch');
  }

  if (isPt) {
    s = fixPortugueseRowWording(s);
    s = s.replace(/Foco nas linhas Nintendo Switch/gi, 'Foco nos preços da Nintendo Switch');
    s = s.replace(
      /continua a linha\s*\n\s*Nintendo Switch mais barata neste snapshot/gi,
      'continua a ser a região Nintendo Switch mais barata neste snapshot',
    );
    s = s.replace(/a linha japonesa atual/gi, 'o preço japonês atual');
  }
  if (isDe) s = fixGermanRowWording(s);
  if (isJa) s = fixJapaneseRowLiteral(s);
  if (isEs) s = fixSpanishRowWording(s);
  if (isFr) s = fixFrenchRowWording(s);

  return s;
}

function main() {
  const files = listAllBlogPostMarkdownPaths();
  let changed = 0;
  for (const abs of files) {
    const rel = abs.split(/[/\\]/).slice(-4).join('/');
    const before = readFileSync(abs, 'utf8');
    const after = fixContent(before, rel);
    if (after !== before) {
      writeFileSync(abs, after, 'utf8');
      changed += 1;
    }
  }
  console.log(JSON.stringify({ files: files.length, modified: changed }, null, 2));
}

main();
