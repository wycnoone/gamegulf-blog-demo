import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog-shell";
import { isLocale } from "@/lib/i18n";

export default async function LocaleBlogLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <BlogShell locale={locale}>{children}</BlogShell>;
}
