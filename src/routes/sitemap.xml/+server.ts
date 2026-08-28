import { LINES } from '$lib/config/lines';

export const prerender = false;

export const GET = async ({ url, setHeaders }) => {
  const paths = ['/', ...LINES.map((line) => `/${line.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${url.origin}${path}</loc><changefreq>hourly</changefreq></url>`).join('\n')}
</urlset>`;
  setHeaders({ 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' });
  return new Response(body);
};
