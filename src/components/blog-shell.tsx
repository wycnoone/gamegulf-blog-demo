import Link from "next/link";
import { ReactNode } from "react";
import { siteUrl } from "@/lib/blog";
import { blogBasePath, BlogLocale, localeLabels, locales } from "@/lib/i18n";

type BlogShellProps = {
  locale: BlogLocale;
  children: ReactNode;
};

const localeDescriptions: Record<BlogLocale, string> = {
  en: "Switch buying guides, sale timing tips, and price-saving advice for players who want to buy smarter.",
  "zh-hans": "帮助你判断值不值得买、什么时候入手更划算的 Switch 购买指南。",
};

export function BlogShell({ locale, children }: BlogShellProps) {
  const mainSiteLinks = {
    home: siteUrl,
    games: `${siteUrl}/games`,
    wishlist: `${siteUrl}/wishlist`,
  };

  return (
    <div className="blog-page">
      <header className="site-header">
        <div className="blog-shell site-header-inner">
          <a href={mainSiteLinks.home} className="brand-lockup">
            <div className="brand-mark">G</div>
            <div className="brand-copy">
              <strong>GAMEGULF</strong>
            </div>
          </a>
          <nav className="primary-nav" aria-label="Primary">
            <a href={mainSiteLinks.home}>Home</a>
            <a href={mainSiteLinks.games}>Game</a>
            <a href={mainSiteLinks.wishlist}>Wish List</a>
          </nav>
          <div className="header-actions">
            <span className="icon-badge" aria-hidden="true">
              S
            </span>
            <span className="icon-badge" aria-hidden="true">
              A
            </span>
            <span className="icon-badge" aria-hidden="true">
              U
            </span>
          </div>
        </div>
      </header>

      <div className="blog-shell">
        <section className="blog-intro">
          <div>
            <p className="eyebrow">GameGulf Blog</p>
            <div className="blog-intro-title">
              {locale === "en" ? "Switch Buying Guides" : "Switch 购买决策内容"}
            </div>
            <p>{localeDescriptions[locale]}</p>
          </div>
          <div className="locale-switcher">
            {locales.map((entry) => (
              <Link
                key={entry}
                href={`${blogBasePath}/${entry}`}
                className={`pill-link ${entry === locale ? "active" : ""}`}
              >
                {localeLabels[entry]}
              </Link>
            ))}
          </div>
        </section>
        {children}

        <footer className="site-footer section-block">
          <div className="site-footer-grid">
            <div className="footer-brand">
              <a href={mainSiteLinks.home} className="brand-lockup">
                <div className="brand-mark">G</div>
                <div className="brand-copy">
                  <strong>GAMEGULF</strong>
                </div>
              </a>
              <p>
                {locale === "en"
                  ? "Compare prices, judge sale timing, and find games that fit your library before you spend."
                  : "在入手前先比较价格、判断时机，再找到更适合自己的一款游戏。"}
              </p>
              <div className="footer-socials">
                <span className="icon-badge">FB</span>
                <span className="icon-badge">IN</span>
                <span className="icon-badge">X</span>
                <span className="icon-badge">YT</span>
              </div>
            </div>
            <div>
              <h3>About</h3>
              <span className="footer-static-link">About us</span>
              <span className="footer-static-link">Contact us</span>
              <span className="footer-static-link">Help center</span>
            </div>
            <div>
              <h3>Legal</h3>
              <span className="footer-static-link">T&amp;C</span>
              <span className="footer-static-link">Privacy policy</span>
              <span className="footer-static-link">Copyright</span>
            </div>
            <div>
              <h3>Customer Service</h3>
              <p>Support</p>
              <p>24/7 response target</p>
              <span className="button-link footer-button is-disabled" aria-disabled="true">
                7 X 24H
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
