# Deprecated: Railway + Cloudflare

This project no longer uses **Railway** or **Render** for hosting or Postgres.

Use **[CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)** instead:

- **Neon** — PostgreSQL (`DATABASE_URL` pooled, `DIRECT_URL` for migrations)
- **Cloudflare Workers** — Next.js app (OpenNext + Wrangler)
- **Cloudflare DNS** — custom domain and school subdomains
