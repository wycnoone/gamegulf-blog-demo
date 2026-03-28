import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <p className="eyebrow">GameGulf Blog</p>
        <h1>Find the right game, the right price, and the right time to buy.</h1>
        <p className="hero-copy">
          Explore buying guides built for players who want to know what is
          worth buying now, what should stay on the wishlist, and when a sale
          is strong enough to act on.
        </p>
        <div className="hero-actions">
          <Link href="/blog/en">Explore English guides</Link>
          <Link href="/blog/zh-hans" className="secondary-link">
            查看简体中文指南
          </Link>
        </div>
      </section>
    </main>
  );
}
