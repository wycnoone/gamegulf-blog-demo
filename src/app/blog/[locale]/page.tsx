import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DecisionHomeHub } from "@/components/decision-home-hub";
import {
  defaultOgImage,
  getDecisionEntryCards,
  getLocaleAlternates,
  siteUrl,
} from "@/lib/blog";
import { BlogLocale, blogBasePath, isLocale, locales } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string }>;
};

function getLocaleCopy(locale: BlogLocale) {
  if (locale === "zh-hans") {
    return {
      title: "Switch 购买指南",
      description:
        "帮助玩家判断买什么、什么时候买、什么值得等，再决定是继续读文章、看价格还是先开启提醒。",
    };
  }

  return {
    title: "Switch Buying Guides",
    description:
      "Figure out what to buy, what to wait on, and what belongs on an alert list before you spend.",
  };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getLocaleCopy(locale);
  const path = `${blogBasePath}/${locale}`;

  return {
    title: locale === "en" ? "Switch Buying Guides" : "Switch 购买指南",
    description: copy.description,
    alternates: {
      canonical: path,
      languages: getLocaleAlternates(
        Object.fromEntries(locales.map((entry) => [entry, `${blogBasePath}/${entry}`])),
      ),
    },
    openGraph: {
      title: locale === "en" ? "Switch Buying Guides" : "Switch 购买指南",
      description: copy.description,
      url: `${siteUrl}${path}`,
      type: "website",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: "GameGulf blog overview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: locale === "en" ? "Switch Buying Guides" : "Switch 购买指南",
      description: copy.description,
      images: [defaultOgImage],
    },
  };
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cards = getDecisionEntryCards(locale);

  return <DecisionHomeHub locale={locale} cards={cards} />;
}
