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
            <div className="brand-mark brand-mark-logo" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#3B82F6" />
                <path
                  d="M22 16C22 19.3137 19.3137 22 16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C17.6569 10 19.1569 10.6716 20.2426 11.7574L18.8284 13.1716C18.1046 12.4477 17.1046 12 16 12C13.7909 12 12 13.7909 12 16C12 18.2091 13.7909 20 16 20C18.2091 20 20 18.2091 20 16H16V14H22V16Z"
                  fill="white"
                />
              </svg>
            </div>
            <div className="brand-copy">
              <strong>GAMEGULF</strong>
            </div>
          </a>
          <nav className="primary-nav" aria-label="Primary">
            <a href={mainSiteLinks.home} className="primary-nav-home-active">
              <span>Home</span>
              <svg className="primary-nav-squiggle" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M0,10 Q15,20 30,10 T60,10 T100,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </a>
            <a href={mainSiteLinks.games}>Games</a>
            <a href={mainSiteLinks.wishlist}>Wishlist</a>
          </nav>
          <div className="header-actions">
            <button type="button" className="header-action-button" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
                <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="header-action-button header-region-button" aria-label="Region">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 4C14.6 6.2 16 9 16 12C16 15 14.6 17.8 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 4C9.4 6.2 8 9 8 12C8 15 9.4 17.8 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="header-region-label">EU</span>
            </button>
            <button type="button" className="header-action-button" aria-label="Messages">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 6.5C5 5.11929 6.11929 4 7.5 4H16.5C17.8807 4 19 5.11929 19 6.5V12.5C19 13.8807 17.8807 15 16.5 15H11L7 18V15H7.5C6.11929 15 5 13.8807 5 12.5V6.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <a href={mainSiteLinks.home} className="login-pill">
              LOG IN
            </a>
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
