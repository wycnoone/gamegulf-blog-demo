import type { BlogLocale } from '@/lib/i18n';

type TrustModuleProps = {
  locale: BlogLocale;
  compact?: boolean;
};

const trustItemsEn = [
  'Is the current price fair?',
  'How much cheaper could it get?',
  'Is this game a fit for me?',
  'What do real players think?',
  'Is it worth my time?',
];

const trustItemsZh = [
  '现在的价格合不合理？',
  '等一等能便宜多少？',
  '这游戏适合我吗？',
  '玩家真正怎么评价的？',
  '花这个时间值不值？',
];

export function TrustModule({ locale, compact = false }: TrustModuleProps) {
  const items = locale === 'en' ? trustItemsEn : trustItemsZh;
  const title = locale === 'en'
    ? 'Every guide answers these 5 questions'
    : '每篇指南回答这 5 个问题';
  const subtitle = locale === 'en'
    ? 'So you can decide faster, with less guesswork.'
    : '让你更快做出判断，减少纠结。';

  return (
    <section className={`trust-module ${compact ? 'compact' : ''}`}>
      <div className="trust-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="trust-grid">
        {items.map((item, i) => (
          <div key={item} className="trust-item">
            <span className="trust-number" aria-hidden="true">{i + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
