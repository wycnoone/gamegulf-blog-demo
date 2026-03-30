import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const siteUrl = 'https://www.gamegulf.com';
  const body = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${siteUrl}/blog/sitemap-index.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
