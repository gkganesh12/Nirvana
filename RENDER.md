# SignalCraft Render Deployment Guide

This guide walks through deploying SignalCraft to [Render](https://render.com) using their Blueprint specification.

## Prerequisites

- Render account
- GitHub repository with SignalCraft code
- Clerk account for authentication
- (Optional) SendGrid/SMTP credentials for email

---

## Quick Start with Blueprint

### Step 1: Create `render.yaml`

Create this file in your repository root:

```yaml
services:
  # API Server
  - type: web
    name: signalcraft-api
    runtime: node
    region: oregon
    plan: starter
    buildCommand: npm ci && npm run build -w @signalcraft/api
    startCommand: npm run start -w @signalcraft/api
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      - key: DATABASE_URL
        fromDatabase:
          name: signalcraft-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: signalcraft-redis
          property: connectionString
      - key: CLERK_SECRET_KEY
        sync: false
      - key: CLERK_ISSUER
        sync: false
      - key: FRONTEND_URL
        value: https://signalcraft-web.onrender.com
      - key: API_BASE_URL
        value: https://signalcraft-api.onrender.com
      - key: ENCRYPTION_KEY
        generateValue: true
      - key: CORS_ORIGINS
        value: https://signalcraft-web.onrender.com

  # Web Frontend
  - type: web
    name: signalcraft-web
    runtime: node
    region: oregon
    plan: starter
    buildCommand: npm ci && npm run build -w @signalcraft/web
    startCommand: npm run start -w @signalcraft/web
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: https://signalcraft-api.onrender.com
      - key: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        sync: false
      - key: CLERK_SECRET_KEY
        sync: false

  # Background Worker
  - type: worker
    name: signalcraft-worker
    runtime: node
    region: oregon
    plan: starter
    buildCommand: npm ci && npm run build -w @signalcraft/api
    startCommand: npm run start:worker -w @signalcraft/api
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: signalcraft-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: signalcraft-redis
          property: connectionString
      - key: CLERK_SECRET_KEY
        sync: false

databases:
  - name: signalcraft-db
    plan: starter
    region: oregon
    databaseName: signalcraft
    user: signalcraft

# Redis
  - type: redis
    name: signalcraft-redis
    plan: starter
    region: oregon
    maxmemoryPolicy: allkeys-lru
```

### Step 2: Deploy via Render Dashboard

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show the services
5. Fill in the secret environment variables:
   - `CLERK_SECRET_KEY`
   - `CLERK_ISSUER`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
6. Click **Apply**

### Step 3: Run Database Migrations

After deployment, open the API service shell:

```bash
npx prisma migrate deploy
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set from Render DB |
| `REDIS_URL` | Redis connection string | Auto-set from Render Redis |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_...` |
| `CLERK_ISSUER` | Clerk frontend API URL | `https://xxx.clerk.accounts.dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_live_...` |
| `ENCRYPTION_KEY` | 32-char encryption key | Auto-generated |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | Email service API key | - |
| `SLACK_CLIENT_ID` | Slack OAuth app ID | - |
| `SLACK_CLIENT_SECRET` | Slack OAuth secret | - |
| `OPENROUTER_API_KEY` | AI features API key | - |

---

## Post-Deployment Checklist

- [ ] Verify health endpoint: `curl https://signalcraft-api.onrender.com/health`
- [ ] Access web app: `https://signalcraft-web.onrender.com`
- [ ] Check API docs: `https://signalcraft-api.onrender.com/api/docs`
- [ ] Create first workspace and user via Clerk
- [ ] Configure integrations (Slack, etc.)

---

## Scaling

### Upgrade Plans

| Service | Starter | Standard | Pro |
|---------|---------|----------|-----|
| API | 512MB RAM | 2GB RAM | 4GB RAM |
| Worker | 512MB RAM | 2GB RAM | 4GB RAM |
| Database | 1GB | 10GB | 100GB |

### Horizontal Scaling

For high availability, create additional worker instances:

```yaml
- type: worker
  name: signalcraft-worker-2
  # ... same config as primary worker
```

---

## Troubleshooting

### Build Fails

```bash
# Check build logs in Render dashboard
# Common issues:
# - Missing package-lock.json (run npm install locally first)
# - Node version mismatch (specify in package.json engines)
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set correctly
# Check Render DB is in READY state
# Ensure migrations ran successfully
```

### Worker Not Processing Jobs

```bash
# Check REDIS_URL is set
# Verify worker logs for connection errors
# Ensure Redis is in READY state
```

---

## Cost Estimate

| Component | Plan | Monthly Cost |
|-----------|------|--------------|
| API | Starter | $7 |
| Web | Starter | $7 |
| Worker | Starter | $7 |
| PostgreSQL | Starter | $7 |
| Redis | Starter | Free |
| **Total** | | **~$28/month** |

> [!TIP]
> Use Render's free tier for development: API and Web can use free tier, but workers require paid plans.
