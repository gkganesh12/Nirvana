# Deployment Guide

This document provides comprehensive information about deploying and operating SignalCraft in production environments.

## Architecture Overview

SignalCraft is a distributed system consisting of the following components:

```mermaid
graph TB
    subgraph "Frontend"
        Web[Next.js Web App]
    end
    
    subgraph "Backend"
        API[NestJS API Server]
        Worker[BullMQ Workers]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Cache[(Redis)]
        Storage[Object Storage]
    end
    
    subgraph "External Services"
        Clerk[Clerk Auth]
        Email[Email Provider]
        Monitoring[Monitoring Tools]
    end
    
    Web --> API
    API --> DB
    API --> Cache
    Worker --> Cache
    Worker --> DB
    API --> Clerk
    API --> Email
    API --> Monitoring
```

## Infrastructure Components

### 1. Application Services

#### API Server (NestJS)
- **Runtime**: Node.js 18+
- **Port**: 5050 (configurable)
- **Scaling**: Horizontal (stateless)
- **Health Check**: `GET /api/health`

#### Web Server (Next.js)
- **Runtime**: Node.js 18+
- **Port**: 3000 (configurable)
- **Scaling**: Horizontal (stateless)
- **Rendering**: Server-Side Rendering (SSR)

#### Background Workers (BullMQ)
- **Runtime**: Node.js 18+
- **Queues**: `notifications`, `escalations`, `session-replay`
- **Scaling**: Horizontal (multiple workers per queue)

### 2. Data Stores

#### PostgreSQL
- **Version**: 15+
- **Purpose**: Primary data store
- **Backup**: Daily automated backups recommended
- **Connection Pooling**: Recommended (e.g., PgBouncer)

**Schema Management**: Prisma migrations
```bash
npx prisma migrate deploy
```

#### Redis
- **Version**: 7+
- **Purpose**: 
  - Session caching
  - Job queues (BullMQ)
  - Rate limiting
- **Persistence**: AOF recommended for queue durability
- **Scaling**: Redis Cluster for high availability

#### Object Storage (Optional)
- **Purpose**: Session replay recordings
- **Providers**: Cloudflare R2, AWS S3, MinIO
- **Configuration**: Set `R2_*` environment variables

### 3. External Services

#### Clerk (Authentication)
- **Required**: Yes
- **Setup**: Create application at [clerk.com](https://clerk.com)
- **Credentials**: 
  - `CLERK_SECRET_KEY`
  - `CLERK_JWT_PUBLIC_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

#### Email Provider
- **Required**: For notifications and invitations
- **Supported**: SMTP, SendGrid, Resend
- **Configuration**: Set `EMAIL_*` environment variables

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/signalcraft

# Redis
REDIS_URL=redis://host:6379

# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32_byte_base64_key
```

### Optional Variables

```env
# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@yourdomain.com

# Session Replay (Cloudflare R2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=signalcraft-replays

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
ENABLE_SESSION_REPLAY=true
ENABLE_SAML_SSO=true
```

## Deployment Options

### Option 1: Docker Compose (Development/Small Production)

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api npx prisma migrate deploy

# View logs
docker-compose logs -f api web
```

### Option 2: Kubernetes (Production)

Example deployment manifests:

**API Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signalcraft-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: signalcraft-api
  template:
    metadata:
      labels:
        app: signalcraft-api
    spec:
      containers:
      - name: api
        image: signalcraft-api:latest
        ports:
        - containerPort: 5050
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: signalcraft-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: signalcraft-secrets
              key: redis-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5050
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Option 3: Platform as a Service

SignalCraft can be deployed to:
- **Railway**: Connect GitHub repo and configure environment variables
- **Render**: Use `render.yaml` blueprint
- **Fly.io**: Use `fly.toml` configuration
- **Vercel** (Web only): Deploy Next.js app directly

## Database Migrations

### Development
```bash
cd packages/database
npx prisma migrate dev --name migration_name
```

### Production
```bash
# Always backup before migrating!
pg_dump $DATABASE_URL > backup.sql

# Run migrations
npx prisma migrate deploy
```

### Rollback Strategy
Prisma doesn't support automatic rollbacks. To rollback:
1. Restore from backup
2. Revert migration files
3. Regenerate Prisma client

## Monitoring & Observability

### Health Checks

- **API**: `GET /api/health`
  - Returns: `{ status: 'ok', timestamp, uptime }`
- **Database**: Included in health check
- **Redis**: Included in health check

### Logging

Structured JSON logs via `pino`:
```json
{
  "level": "info",
  "time": 1642512000000,
  "msg": "Alert processed",
  "alertId": "abc123",
  "workspaceId": "xyz789"
}
```

### Metrics

Key metrics to monitor:
- **API Response Time**: p50, p95, p99
- **Queue Depth**: Notifications, Escalations
- **Database Connections**: Active, Idle
- **Error Rate**: 5xx responses
- **Alert Processing Time**: End-to-end latency

### Recommended Tools

- **APM**: Sentry, DataDog, New Relic
- **Logs**: Loki, CloudWatch, Datadog
- **Metrics**: Prometheus + Grafana

## Security Considerations

### Secrets Management

- **Never commit** `.env` files
- Use secret managers: AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets
- Rotate credentials regularly

### Network Security

- **TLS/SSL**: Required for production
- **Firewall**: Restrict database/Redis access to application servers only
- **CORS**: Configure allowed origins in API

### Database Security

- Use **read-only** database users where possible
- Enable **connection encryption** (SSL mode)
- Implement **row-level security** for multi-tenancy

## Scaling Guidelines

### Horizontal Scaling

All services are stateless and can scale horizontally:

- **API**: Add more instances behind load balancer
- **Web**: Add more instances (CDN for static assets)
- **Workers**: Add more worker processes per queue

### Vertical Scaling

Resource recommendations per service:

| Service | CPU | Memory | Notes |
|---------|-----|--------|-------|
| API | 1-2 cores | 1-2 GB | Per instance |
| Web | 1 core | 512 MB - 1 GB | Per instance |
| Worker | 1 core | 512 MB | Per worker |
| PostgreSQL | 4+ cores | 8+ GB | Depends on load |
| Redis | 2 cores | 2-4 GB | Depends on queue size |

### Database Optimization

- **Connection Pooling**: Use PgBouncer (recommended: 20-50 connections)
- **Indexes**: Monitor slow queries and add indexes
- **Partitioning**: Consider partitioning `AlertEvent` table by date

## Backup & Disaster Recovery

### Database Backups

```bash
# Daily automated backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260121.sql.gz | psql $DATABASE_URL
```

### Redis Persistence

Configure Redis with AOF:
```conf
appendonly yes
appendfsync everysec
```

### Recovery Time Objective (RTO)

- **Database**: < 1 hour (with automated backups)
- **Application**: < 15 minutes (stateless services)

## Troubleshooting

### Common Issues

**Issue**: API returns 500 errors
- Check database connectivity
- Verify environment variables
- Review application logs

**Issue**: Notifications not sending
- Check Redis connectivity
- Verify worker processes are running
- Check queue status: `redis-cli LLEN bull:notifications:wait`

**Issue**: High database CPU
- Review slow query log
- Check for missing indexes
- Consider connection pooling

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Support

For deployment assistance:
- **Documentation**: `/Docs` directory
- **Issues**: GitHub Issues
- **Community**: GitHub Discussions
