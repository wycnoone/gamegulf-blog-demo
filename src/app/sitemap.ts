import type { MetadataRoute } from "next";
import {
  categories,
  getAllBlogPaths,
  getAllPosts,
  getPostsByCategory,
  siteUrl,
} from "@/lib/blog";
import { blogBasePath, locales } from "@/lib/i18n";

export const dynamic = "force-static";

function getLatestDate(dates: string[]) {
  if (dates.length === 0) {
    return undefined;
  }

  return new Date(
    dates.reduce((latest, current) =>
      new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
    ),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const allPosts = locales.flatMap((locale) => getAllPosts(locale));
  const latestSiteUpdate = getLatestDate(
    allPosts.map((post) => post.updatedAt || post.publishedAt),
  );

  const staticRoutes = [
    {
      url: `${siteUrl}/`,
      lastModified: latestSiteUpdate,
    },
    ...locales.map((locale) => {
      const latestLocaleUpdate = getLatestDate(
        getAllPosts(locale).map((post) => post.updatedAt || post.publishedAt),
      );

      return {
        url: `${siteUrl}${blogBasePath}/${locale}`,
        lastModified: latestLocaleUpdate,
      };
    }),
    ...locales.flatMap((locale) =>
      categories.map((category) => {
        const latestCategoryUpdate = getLatestDate(
          getPostsByCategory(locale, category).map(
            (post) => post.updatedAt || post.publishedAt,
          ),
        );

        return {
          url: `${siteUrl}${blogBasePath}/${locale}/${category}`,
          lastModified: latestCategoryUpdate,
        };
      }),
    ),
  ];

  const articleRoutes = getAllBlogPaths().map((entry) => ({
    url: `${siteUrl}${blogBasePath}/${entry.locale}/${entry.category}/${entry.slug}`,
    lastModified: new Date(entry.updatedAt),
  }));

  return [...staticRoutes, ...articleRoutes];
}
