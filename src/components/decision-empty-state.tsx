"use client";

import Link from "next/link";
import type { BlogLocale } from "@/lib/i18n";

type DecisionEmptyStateProps = {
  locale: BlogLocale;
  onReset: () => void;
};

export function DecisionEmptyState({
  locale,
  onReset,
}: DecisionEmptyStateProps) {
  const isEnglish = locale === "en";

  return (
    <div className="decision-empty-state">
      <h3>{isEnglish ? "No guides match this view yet" : "当前没有匹配的文章"}</h3>
      <p>
        {isEnglish
          ? "Try clearing your search or filters, then jump back in with one of the strongest decision paths."
          : "试试清空搜索和筛选，再从更明确的问题入口继续浏览。"}
      </p>
      <div className="decision-empty-actions">
        <button type="button" className="button-link" onClick={onReset}>
          {isEnglish ? "Reset filters" : "清空筛选"}
        </button>
        <Link href={`/blog/${locale}/worth-it`} className="button-link secondary">
          {isEnglish ? "Open Worth It" : "查看值不值得买"}
        </Link>
        <Link
          href={`/blog/${locale}/buy-now-or-wait`}
          className="button-link secondary"
        >
          {isEnglish ? "Open Buy Now or Wait" : "查看现在买还是等打折"}
        </Link>
      </div>
    </div>
  );
}
