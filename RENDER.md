# SignalCraft Render Deployment Guide

Complete step-by-step guide to deploy SignalCraft on [Render](https://render.com).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create PostgreSQL Database](#step-1-create-postgresql-database)
3. [Step 2: Create Redis Instance](#step-2-create-redis-instance)
4. [Step 3: Deploy API Server](#step-3-deploy-api-server)
5. [Step 4: Deploy Web Frontend](#step-4-deploy-web-frontend)
6. [Step 5: Deploy Background Worker](#step-5-deploy-background-worker)
7. [Step 6: Run Database Migrations](#step-6-run-database-migrations)
8. [Step 7: Configure Clerk Authentication](#step-7-configure-clerk-authentication)
9. [Step 8: Verify Deployment](#step-8-verify-deployment)
10. [Environment Variables Reference](#environment-variables-reference)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Render account** - Sign up at [render.com](https://render.com)
- [ ] **GitHub repository** - Push SignalCraft code to GitHub
- [ ] **Clerk account** - Sign up at [clerk.com](https://clerk.com) and create an application
- [ ] **Domain** (optional) - Custom domain for your deployment

### Get Clerk Credentials

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application (or use existing)
3. Go to **API Keys** and copy:
   - `CLERK_SECRET_KEY` (starts with `sk_live_` or `sk_test_`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_` or `pk_test_`)
4. Go to **JWT Templates** → Note your frontend API URL as `CLERK_ISSUER` (e.g., `https://your-app.clerk.accounts.dev`)

---

## Step 1: Create PostgreSQL Database

### 1.1 Navigate to Database Creation

1. Log in to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** button in the top right
3. Select **PostgreSQL**

### 1.2 Configure Database

| Setting | Value |
|---------|-------|
| **Name** | `signalcraft-db` |
| **Database** | `signalcraft` |
| **User** | `signalcraft` |
| **Region** | `Oregon (US West)` (or closest to your users) |
| **PostgreSQL Version** | `16` |
| **Plan** | `Starter` ($7/month) or `Free` (for testing) |

### 1.3 Create Database

1. Click **Create Database**
2. Wait for status to show **Available** (takes 1-2 minutes)
3. Click on the database and copy the **Internal Database URL**
   - Format: `postgres://signalcraft:PASSWORD@oregon-postgres.render.com/signalcraft`
4. **Save this URL** - you'll need it for the API and Worker

---

## Step 2: Create Redis Instance

### 2.1 Navigate to Redis Creation

1. Click **New +** → **Redis**

### 2.2 Configure Redis

| Setting | Value |
|---------|-------|
| **Name** | `signalcraft-redis` |
| **Region** | Same as database (`Oregon`) |
| **Maxmemory Policy** | `allkeys-lru` |
| **Plan** | `Starter` (Free) |

### 2.3 Create Redis

1. Click **Create Redis**
2. Wait for status to show **Available**
3. Copy the **Internal Redis URL**
   - Format: `redis://red-xxx:6379`
4. **Save this URL** - you'll need it for the API and Worker

---

## Step 3: Deploy API Server

### 3.1 Navigate to Web Service Creation

1. Click **New +** → **Web Service**
2. Connect your GitHub account if not already connected
3. Select your SignalCraft repository

### 3.2 Configure API Service

| Setting | Value |
|---------|-------|
| **Name** | `signalcraft-api` |
| **Region** | Same as database (`Oregon`) |
| **Branch** | `main` |
| **Root Directory** | Leave empty |
| **Runtime** | `Node` |
| **Build Command** | See below |
| **Start Command** | See below |
| **Plan** | `Starter` ($7/month) |

**Build Command:**
```bash
npm ci --include=dev && npm run build -w @signalcraft/database && npm run build -w @signalcraft/api
```

**Start Command:**
```bash
cd apps/api && node dist/main.js
```

### 3.3 Configure Environment Variables

Click **Advanced** → **Add Environment Variable** for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Paste your PostgreSQL Internal URL |
| `REDIS_URL` | Paste your Redis Internal URL |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `CLERK_ISSUER` | Your Clerk frontend API URL |
| `FRONTEND_URL` | `https://signalcraft-web.onrender.com` |
| `API_BASE_URL` | `https://signalcraft-api.onrender.com` |
| `CORS_ORIGINS` | `https://signalcraft-web.onrender.com` |
| `ENCRYPTION_KEY` | Generate a 32-character random string |

> **Generate ENCRYPTION_KEY:**
> ```bash
> openssl rand -hex 16
> ```

### 3.4 Configure Health Check

| Setting | Value |
|---------|-------|
| **Health Check Path** | `/health` |

### 3.5 Create API Service

1. Click **Create Web Service**
2. Wait for the first deploy to complete (5-10 minutes)
3. Note your API URL: `https://signalcraft-api.onrender.com`

---

## Step 4: Deploy Web Frontend

### 4.1 Navigate to Web Service Creation

1. Click **New +** → **Web Service**
2. Select your SignalCraft repository again

### 4.2 Configure Web Service

| Setting | Value |
|---------|-------|
| **Name** | `signalcraft-web` |
| **Region** | Same as API (`Oregon`) |
| **Branch** | `main` |
| **Root Directory** | Leave empty |
| **Runtime** | `Node` |
| **Build Command** | See below |
| **Start Command** | See below |
| **Plan** | `Starter` ($7/month) |

**Build Command:**
```bash
npm ci && npm run build -w @signalcraft/web
```

**Start Command:**
```bash
cd apps/web && npm run start
```

### 4.3 Configure Environment Variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://signalcraft-api.onrender.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |

### 4.4 Create Web Service

1. Click **Create Web Service**
2. Wait for deploy to complete (5-10 minutes)
3. Note your Web URL: `https://signalcraft-web.onrender.com`

---

## Step 5: Deploy Background Worker

### 5.1 Navigate to Worker Creation

1. Click **New +** → **Background Worker**
2. Select your SignalCraft repository

### 5.2 Configure Worker Service

| Setting | Value |
|---------|-------|
| **Name** | `signalcraft-worker` |
| **Region** | Same as API (`Oregon`) |
| **Branch** | `main` |
| **Root Directory** | Leave empty |
| **Runtime** | `Node` |
| **Build Command** | See below |
| **Start Command** | See below |
| **Plan** | `Starter` ($7/month) |

**Build Command:**
```bash
npm ci && npm run build -w @signalcraft/database && npm run build -w @signalcraft/api
```

**Start Command:**
```bash
cd apps/api && node dist/queues/worker.js
```

### 5.3 Configure Environment Variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Same as API |
| `REDIS_URL` | Same as API |
| `CLERK_SECRET_KEY` | Same as API |
| `ENCRYPTION_KEY` | Same as API |

### 5.4 Create Worker Service

1. Click **Create Background Worker**
2. Wait for deploy to complete

---

## Step 6: Run Database Migrations

### 6.1 Open API Shell

1. Go to your `signalcraft-api` service
2. Click **Shell** tab
3. Wait for shell to connect

### 6.2 Run Prisma Migrations

```bash
cd /opt/render/project/src
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 6.3 Verify Migration

```bash
npx prisma db pull --schema=packages/database/prisma/schema.prisma
```

You should see "The database is in sync with the Prisma schema."

---

## Step 7: Configure Clerk Authentication

### 7.1 Update Clerk Allowed Origins

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **Paths** → **Allowed Origins**
4. Add:
   - `https://signalcraft-web.onrender.com`
   - `https://signalcraft-api.onrender.com`

### 7.2 Configure Clerk Webhooks (Optional)

1. Go to **Webhooks** in Clerk dashboard
2. Add endpoint: `https://signalcraft-api.onrender.com/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`

---

## Step 8: Verify Deployment

### 8.1 Check Health Endpoints

```bash
# API Health
curl https://signalcraft-api.onrender.com/health

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

### 8.2 Access Web Application

1. Open `https://signalcraft-web.onrender.com`
2. You should see the SignalCraft landing page
3. Click **Sign In** and authenticate via Clerk

### 8.3 Check API Documentation

1. Open `https://signalcraft-api.onrender.com/api/docs`
2. You should see the Swagger UI with all API endpoints

### 8.4 Test Webhook Endpoint

```bash
curl -X POST https://signalcraft-api.onrender.com/api/v1/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Alert","severity":"HIGH","message":"Testing deployment"}'
```

---

## Environment Variables Reference

### Required for API

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@host/db` |
| `REDIS_URL` | Redis connection | `redis://host:6379` |
| `CLERK_SECRET_KEY` | Clerk authentication | `sk_live_xxx` |
| `CLERK_ISSUER` | Clerk frontend API | `https://xxx.clerk.accounts.dev` |
| `ENCRYPTION_KEY` | 32-char secret | `abcd1234...` |
| `FRONTEND_URL` | Web app URL | `https://signalcraft-web.onrender.com` |
| `API_BASE_URL` | API URL | `https://signalcraft-api.onrender.com` |
| `CORS_ORIGINS` | Allowed origins | `https://signalcraft-web.onrender.com` |

### Required for Web

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API URL | `https://signalcraft-api.onrender.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Clerk secret | `sk_live_xxx` |

### Optional (Integrations)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | Email notifications |
| `SLACK_CLIENT_ID` | Slack integration |
| `SLACK_CLIENT_SECRET` | Slack integration |
| `TWILIO_ACCOUNT_SID` | SMS/Voice notifications |
| `TWILIO_AUTH_TOKEN` | SMS/Voice notifications |
| `OPENROUTER_API_KEY` | AI suggestions |

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Cause:** Dependencies not installed correctly

**Solution:**
```bash
# In build command, ensure npm ci runs first:
npm ci && npm run build -w @signalcraft/database && npm run build -w @signalcraft/api
```

### Database Connection Refused

**Cause:** Using external URL instead of internal

**Solution:** Use the **Internal Database URL** from Render, not the external one.

### Worker Not Processing Jobs

**Cause 1:** Redis not connected

**Solution:** Check REDIS_URL is set correctly in worker env vars

**Cause 2:** Worker not running

**Solution:** Check worker logs in Render dashboard for errors

### CORS Errors

**Cause:** CORS_ORIGINS not set correctly

**Solution:** Ensure CORS_ORIGINS includes your frontend URL exactly:
```
https://signalcraft-web.onrender.com
```

### Clerk Authentication Fails

**Cause:** Allowed origins not configured

**Solution:** Add your Render URLs to Clerk's Allowed Origins list

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Starter | $7 |
| Redis | Starter | Free |
| API (Web Service) | Starter | $7 |
| Web (Web Service) | Starter | $7 |
| Worker (Background) | Starter | $7 |
| **Total** | | **$28/month** |

> **Tip:** For development, use Free tier for PostgreSQL and Redis. API and Web can use Free tier but will spin down after 15 minutes of inactivity.

---

## Blueprint Deployment (Alternative)

For automated deployment, push `render.yaml` to your repo and use Render Blueprints:

1. Push code with `render.yaml` to GitHub
2. Go to Render Dashboard → **New** → **Blueprint**
3. Connect repository
4. Fill in environment variables
5. Click **Apply**

See [render.yaml](./render.yaml) for the Blueprint configuration.
