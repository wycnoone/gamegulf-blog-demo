"use client";

import Link from "next/link";
import type { BlogLocale } from "@/lib/i18n";

type ProblemEntryCardProps = {
  locale: BlogLocale;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  statLabel: string;
  statValue: number;
};

export function ProblemEntryCard({
  locale,
  href,
  eyebrow,
  title,
  description,
  statLabel,
  statValue,
}: ProblemEntryCardProps) {
  return (
    <Link href={href} className="problem-entry-card">
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="problem-entry-stat">
        <strong>{statValue}</strong>
        <span>{statLabel}</span>
      </div>
      <span className="problem-entry-link">
        {locale === "en" ? "Open this path" : "进入这个问题入口"}
      </span>
    </Link>
  );
}
