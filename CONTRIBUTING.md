# Contributing to SignalCraft

Thank you for your interest in contributing to SignalCraft! This guide will help you get started with local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **Docker**: For running PostgreSQL and Redis locally ([Download](https://www.docker.com/))
- **Git**: For version control

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SignalCraft.git
cd SignalCraft
```

### 2. Install Dependencies

SignalCraft uses npm workspaces for monorepo management:

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the following required variables:

```env
# Database
DATABASE_URL="postgresql://signalcraft:signalcraft@localhost:5432/signalcraft"

# Redis
REDIS_URL="redis://localhost:6379"

# Clerk Authentication
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_JWT_PUBLIC_KEY="your_clerk_jwt_public_key"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"

# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:5050"

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your_encryption_key"
```

> **Note**: For Clerk credentials, sign up at [clerk.com](https://clerk.com) and create a new application.

### 4. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d postgres redis
```

### 5. Database Setup

Run Prisma migrations to set up the database schema:

```bash
cd packages/database
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 6. Start Development Servers

Start both the API and Web applications:

```bash
# Terminal 1: API Server (NestJS)
cd apps/api
npm run dev

# Terminal 2: Web Server (Next.js)
cd apps/web
npm run dev
```

The applications will be available at:
- **API**: http://localhost:5050
- **Web**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:5050/api/docs

## Project Structure

```
SignalCraft/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Prisma schema and client
│   └── shared/       # Shared types and utilities
├── .github/
│   └── workflows/    # CI/CD pipelines
└── docker/           # Docker configurations
```

## Development Workflow

### Running Tests

```bash
# Unit and integration tests
npm run test

# E2E tests (Playwright)
cd apps/web
npx playwright test

# Watch mode for development
npm run test:watch
```

### Code Quality

Before committing, ensure your code passes all checks:

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format
```

### Database Migrations

When modifying the Prisma schema:

```bash
cd packages/database

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations to production
npx prisma migrate deploy
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` types; use `unknown` if necessary

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add team invitation flow
fix: resolve race condition in alert grouping
docs: update deployment guide
test: add e2e tests for routing rules
```

## Pull Request Process

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Implement** your changes with tests

3. **Verify** all checks pass:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

4. **Commit** your changes with clear messages

5. **Push** to your fork and create a Pull Request

6. **Respond** to code review feedback

## Getting Help

- **Documentation**: Check the `/Docs` directory
- **Issues**: Search existing [GitHub Issues](https://github.com/yourusername/SignalCraft/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/yourusername/SignalCraft/discussions)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
