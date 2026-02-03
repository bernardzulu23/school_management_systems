# Railway + Cloudflare Deployment Guide (Prisma Version)

This guide explains how to deploy the School Management System to **Railway** and configure **Cloudflare** for DNS and security.

## Prerequisites

1.  A [Railway](https://railway.app/) account.
2.  A [Cloudflare](https://www.cloudflare.com/) account.
3.  This repository pushed to GitHub.

## Part 1: Deploy to Railway

1.  **Create a New Project on Railway**:
    *   Go to your Railway Dashboard.
    *   Click **"New Project"** > **"Deploy from GitHub repo"**.
    *   Select this repository.

2.  **Add a Database**:
    *   In the project view, right-click and add a **PostgreSQL** service.
    *   This will be your production database.

3.  **Configure Environment Variables**:
    *   Click on the application service card.
    *   Go to the **"Variables"** tab.
    *   Add the following:
        *   `DATABASE_URL`: Reference your Postgres service (type `${{` and select Postgres > DATABASE_URL).
        *   `NEXT_PUBLIC_APP_URL`: The domain where your app will live (e.g., `https://school.yourdomain.com`).
        *   `NEXTAUTH_SECRET`: Generate a random string.
        *   `NEXTAUTH_URL`: Same as `NEXT_PUBLIC_APP_URL`.
        *   `NODE_ENV`: `production`

4.  **Verify Build settings**:
    *   Railway should automatically detect the `package.json`.
    *   We have updated the build command to: `prisma generate && next build`.
    *   This ensures the Prisma Client is generated before the Next.js build.

5.  **Generate a Domain**:
    *   Go to the **"Settings"** tab of your service.
    *   Under **"Networking"**, click **"Generate Domain"** (e.g., `web-production-1234.up.railway.app`) if you don't have a custom one yet.

## Part 2: Database Migration

You need to push your local schema to the production database.

1.  **Get Connection String**:
    *   In Railway, click your PostgreSQL service.
    *   Go to **Connect** > **Public Networking**.
    *   Copy the **Postgres Connection URL**.

2.  **Push Schema**:
    *   On your local machine, update `.env` with this URL.
    *   Run: `npx prisma db push`
    *   Run: `node prisma/seed.js` (to add initial data).

## Part 3: Configure Cloudflare

1.  **Add Site to Cloudflare**:
    *   Log in to Cloudflare and click **"Add a Site"**.
    *   Enter your domain name.

2.  **Point Domain to Railway**:
    *   In Railway, go to **Settings** > **Networking** > **Custom Domain**.
    *   Enter your custom domain.
    *   Railway will provide a DNS record (CNAME).

3.  **Add DNS Record in Cloudflare**:
    *   In Cloudflare dashboard, go to **DNS** > **Records**.
    *   Add a **CNAME** record:
        *   **Name**: `app` (or `@`).
        *   **Target**: The Railway domain.
        *   **Proxy status**: **Proxied** (Orange cloud).

4.  **SSL/TLS Settings**:
    *   In Cloudflare, go to **SSL/TLS**.
    *   Set the encryption mode to **Full**.

## Troubleshooting

*   **Prisma Errors**: If the build fails with Prisma errors, ensure `npx prisma generate` is running. We added this to the `package.json` build script.
*   **Database Connection**: Ensure `DATABASE_URL` is correct in Railway variables.
