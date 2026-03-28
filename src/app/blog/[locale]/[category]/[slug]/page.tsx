import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import {
  categories,
  formatDate,
  getAllBlogPaths,
  getAlternatePostPath,
  getLocaleAlternates,
  getOgImage,
  getPost,
  getRelatedPosts,
  renderMarkdown,
  siteUrl,
} from "@/lib/blog";
import { blogBasePath, isLocale, locales } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

export async function generateStaticParams() {
  return getAllBlogPaths().map((entry) => ({
    locale: entry.locale,
    category: entry.category,
    slug: entry.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category, slug } = await params;

  if (!isLocale(locale) || !categories.includes(category as never)) {
    return {};
  }

  const post = getPost(locale, category, slug);

  if (!post) {
    return {};
  }

  const path = `${blogBasePath}/${locale}/${category}/${slug}`;
  const alternatePostPath = getAlternatePostPath(post);
  const languages: Record<string, string> = {
    [locale]: `${siteUrl}${path}`,
  };

  if (alternatePostPath) {
    const alternateLocale = locales.find((entry) => entry !== locale);
    if (alternateLocale) {
      languages[alternateLocale] = alternatePostPath;
    }
  }

  languages[locale] = path;
  const ogImage = getOgImage(post);

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: path,
      languages: getLocaleAlternates(languages),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${siteUrl}${path}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.gameTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale, category, slug } = await params;

  if (!isLocale(locale) || !categories.includes(category as never)) {
    notFound();
  }

  const post = getPost(locale, category, slug);

  if (!post) {
    notFound();
  }

  const articleHtml = await renderMarkdown(post.body);
  const relatedPosts = getRelatedPosts(post);
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Blog",
        item: `${siteUrl}${blogBasePath}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: `${siteUrl}${blogBasePath}/${locale}/${category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${siteUrl}${blogBasePath}/${locale}/${category}/${slug}`,
      },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    inLanguage: locale,
    mainEntityOfPage: `${siteUrl}${blogBasePath}/${locale}/${category}/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="article-shell section-block">
        <div>
          <header className="article-header">
            <div className="article-summary-card article-summary-card-compact">
              <div
                className="article-cover-strip"
                style={
                  post.coverImage
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(14, 20, 40, 0.15), rgba(14, 20, 40, 0.55)), url(${post.coverImage})`,
                      }
                    : undefined
                }
              >
                <span className="tag">{post.category}</span>
                <div className="article-cover-strip-meta">
                  <span>{post.platform}</span>
                  <span>{post.heroStat}</span>
                </div>
              </div>
              <div className="meta-row">
                <span>{formatDate(post.publishedAt, post.locale)}</span>
                <span>{post.readingTime}</span>
                <span>{post.author}</span>
              </div>
              <h1>{post.title}</h1>
              <p>{post.description}</p>
              <div className="decision-banner">
                <strong>{locale === "en" ? "Should you buy it?" : "是否值得买？"}</strong>
                <p>{post.decision}</p>
              </div>
              <div className="price-decision-card">
                <div>
                  <span className="price-label">
                    {locale === "en" ? "Current price view" : "当前价格判断"}
                  </span>
                  <strong>
                    {post.category === "worth-it"
                      ? locale === "en"
                        ? "Strong value if the game fits you"
                        : "如果适合你，现在就是不错的价值点"
                      : locale === "en"
                        ? "Buy now only if the current deal clears your target"
                        : "只有当前折扣达到你的心理价位时才建议现在买"}
                  </strong>
                </div>
                <div className="price-signal-inline">{post.priceSignal}</div>
              </div>
            </div>
          </header>

          <div className="article-mobile-actions">
            <section className="sidebar-card sidebar-card-cta">
              <h3>{locale === "en" ? "What to do next" : "下一步操作"}</h3>
              <div className="cta-row">
                <Link href={post.gameHref} className="button-link">
                  {locale === "en" ? "View live pricing" : "查看实时价格"}
                </Link>
                <Link href={post.priceTrackHref} className="button-link accent">
                  {locale === "en" ? "Set sale alert" : "开启降价提醒"}
                </Link>
                <Link href={post.wishlistHref} className="button-link secondary">
                  {locale === "en" ? "Save to wishlist" : "加入愿望单"}
                </Link>
              </div>
            </section>
          </div>

          <section className="article-reading-card">
            <article
              className="article-body"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </section>

          <section className="section-block">
            <div className="section-head">
              <div>
                <h2>FAQ</h2>
                <p>
                  {locale === "en"
                    ? "Quick answers to the questions players usually ask before buying."
                    : "购买前最常见的问题，方便你快速判断。"}
                </p>
              </div>
            </div>
            <FaqList items={post.faq} />
          </section>
        </div>

        <aside className="sidebar-stack">
          <section className="sidebar-card sidebar-card-cta">
            <h3>{locale === "en" ? "What to do next" : "下一步操作"}</h3>
            <div className="cta-row">
              <Link href={post.gameHref} className="button-link">
                {locale === "en" ? "View live pricing" : "查看实时价格"}
              </Link>
              <Link href={post.priceTrackHref} className="button-link accent">
                {locale === "en" ? "Set sale alert" : "开启降价提醒"}
              </Link>
              <Link href={post.wishlistHref} className="button-link secondary">
                {locale === "en" ? "Save to wishlist" : "加入愿望单"}
              </Link>
              <Link href={post.membershipHref} className="button-link secondary">
                {locale === "en" ? "See trial benefits" : "查看试玩权益"}
              </Link>
            </div>
          </section>

          <section className="sidebar-card sidebar-card-emphasis">
            <span className="tag">{post.gameTitle}</span>
            <h3>{locale === "en" ? "Quick takeaway" : "快速结论"}</h3>
            <p>{post.priceSignal}</p>
            <p>
              <strong>{post.heroStat}</strong>
              <br />
              {post.heroNote}
            </p>
          </section>

          <section className="sidebar-card">
            <h3>{locale === "en" ? "Related reads" : "相关推荐"}</h3>
            <ul>
              {relatedPosts.map((item) => (
                <li key={item.slug} className="related-item">
                  <Link
                    className="inline-link"
                    href={`/blog/${item.locale}/${item.category}/${item.slug}`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </>
  );
}
