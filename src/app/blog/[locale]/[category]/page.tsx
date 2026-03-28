import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionCategoryHub } from "@/components/decision-category-hub";
import {
  categories,
  defaultOgImage,
  getCategoryMeta,
  getDecisionEntryCardsByCategory,
  getLocaleAlternates,
  siteUrl,
} from "@/lib/blog";
import { blogBasePath, isLocale, locales } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; category: string }>;
};

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    categories.map((category) => ({
      locale,
      category,
    })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;

  if (!isLocale(locale) || !categories.includes(category as never)) {
    return {};
  }

  const meta = getCategoryMeta(locale, category as (typeof categories)[number]);
  const path = `${blogBasePath}/${locale}/${category}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: path,
      languages: getLocaleAlternates(
        Object.fromEntries(
          locales.map((entry) => [entry, `${blogBasePath}/${entry}/${category}`]),
        ),
      ),
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${siteUrl}${path}`,
      type: "website",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: `${meta.title} on GameGulf`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [defaultOgImage],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;

  if (!isLocale(locale) || !categories.includes(category as never)) {
    notFound();
  }

  const resolvedCategory = category as (typeof categories)[number];
  const cards = getDecisionEntryCardsByCategory(locale, resolvedCategory);

  return (
    <section className="category-shell section-block">
      <DecisionCategoryHub
        locale={locale}
        category={resolvedCategory}
        cards={cards}
      />
    </section>
  );
}
