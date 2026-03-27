# Deployment Guide: Railway + Cloudflare (Prisma Version)

This guide explains how to deploy the School Management System to **Railway** using **PostgreSQL** (via Prisma) and configure **Cloudflare** for DNS.

## 1. Prerequisites

- A [Railway](https://railway.app/) account.
- A [Cloudflare](https://www.cloudflare.com/) account.
- This project pushed to a GitHub repository.

## 2. Deploy to Railway

1.  **Create Project**:
    - Login to Railway.
    - Click **New Project** > **Deploy from GitHub repo**.
    - Select this repository.

2.  **Add Database**:
    - In your Railway project canvas, right-click and add a **PostgreSQL** service.
    - This will act as your production database.

3.  **Configure Environment Variables**:
    - Click on your _application service_ (the GitHub repo card).
    - Go to the **Variables** tab.
    - Add the following:
      - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Railway allows you to reference other services like this).
      - `NEXT_PUBLIC_APP_URL`: Your custom domain (e.g., `https://school.yoursite.com`) or the Railway-provided domain.
      - `NEXTAUTH_SECRET`: A long random string (you can generate one with `openssl rand -base64 32`).
      - `NEXTAUTH_URL`: Same as `NEXT_PUBLIC_APP_URL`.

4.  **Build & Deploy**:
    - Railway will automatically detect the changes and start a deployment.
    - The `package.json` has been updated to run `prisma generate` before building.

## 3. Database Management

Since we are using Prisma, you need to sync your database schema.

**Option A: Push from Local (Recommended for simple setups)**

1.  Get your **Public** connection string from Railway (PostgreSQL service > Connect > Public Networking).
2.  Update your local `.env` file with this `DATABASE_URL`.
3.  Run:
    ```bash
    npx prisma db push
    ```
4.  (Optional) Seed the database:
    ```bash
    node prisma/seed.js
    ```

**Option B: Automated Migration (Advanced)**

- You can add `npx prisma db push` to your Railway "Deploy Command" in Settings, but be careful as this can alter production data.

## 4. Configure Cloudflare

1.  **Add Site**: Log in to Cloudflare and add your domain.
2.  **DNS Records**:
    - In Railway: Go to your App Service > **Settings** > **Networking** > **Custom Domain**.
    - Enter your domain (e.g., `app.yourschool.com`).
    - Railway will give you a **CNAME** target (e.g., `project-production.up.railway.app`).
    - In Cloudflare: Add a **CNAME** record.
      - **Name**: `app` (or `@`)
      - **Target**: The Railway domain.
      - **Proxy Status**: **Proxied** (Orange Cloud).
3.  **SSL/TLS**:
    - Set SSL/TLS mode to **Full** in Cloudflare.

## 5. Troubleshooting

- **Database Error**: Ensure `DATABASE_URL` is set correctly in Railway Variables.
- **Build Error**: Check logs. If `prisma generate` fails, ensure `prisma` is in `dependencies` or `devDependencies`.
