/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.bluepeacktechnologies.com',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },

      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'OAI-SearchBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Claude-Web', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'PerplexityBot', disallow: '/' },
      { userAgent: 'YouBot', disallow: '/' },
      { userAgent: 'cohere-ai', disallow: '/' },
      { userAgent: 'meta-externalagent', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'DataForSeoBot', disallow: '/' },
      { userAgent: 'PetalBot', disallow: '/' },

      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/dashboard', '/api', '/admin', '/platform'] },
    ],
  },
  exclude: [
    '/dashboard/*',
    '/api/*',
    '/admin/*',
    '/platform/*',
    '/login',
    '/signup',
    '/register',
    '/register-school',
    '/onboarding/*',
  ],
  additionalPaths: async () => [
    { loc: '/', changefreq: 'weekly', priority: 1.0, lastmod: new Date().toISOString() },
    { loc: '/privacy', changefreq: 'monthly', priority: 0.5, lastmod: new Date().toISOString() },
    { loc: '/terms', changefreq: 'monthly', priority: 0.5, lastmod: new Date().toISOString() },
  ],
}
