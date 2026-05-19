# Deprecated: Railway + Cloudflare

This project no longer uses **Railway** or **Render** for hosting or Postgres.

Use **[NEON_CLOUDFLARE_SETUP.md](./NEON_CLOUDFLARE_SETUP.md)** instead:

- **Neon** — PostgreSQL (`DATABASE_URL` pooled, `DIRECT_URL` for migrations)
- **Cloudflare Workers** — Next.js app (OpenNext + Wrangler)
- **Cloudflare DNS** — custom domain and school subdomains
