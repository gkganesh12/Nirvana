# Phase 1: Foundation & Infrastructure - Execution Plan

## Overview

Phase 1 establishes the foundational infrastructure for SignalCraft. This phase focuses on setting up the development environment, project structure, core services, and essential tooling required for all subsequent phases.

**Timeline**: Week 1-2  
**Goal**: Create a working monorepo with database, authentication, basic API, frontend shell, queue system, CI/CD, and local development environment.

---

## Prerequisites

Before starting Phase 1, ensure you have:
- Node.js 18+ installed
- Docker and Docker Compose installed
- PostgreSQL client tools (optional, for manual DB access)
- Git configured
- GitHub repository created (or similar version control)
- Basic understanding of TypeScript, NestJS, and Next.js

---

## Task 1.1: Monorepo Setup

### Objective
Create a monorepo structure that supports both frontend and backend applications with shared packages.

### Step-by-Step Execution

#### Step 1.1.1: Initialize Root Project
1. Create root `package.json` with workspace configuration
2. Set up root-level scripts for building, testing, and running all packages
3. Configure root-level dependencies (TypeScript, ESLint, Prettier)
4. Add `.gitignore` file for Node.js projects
5. Create root `README.md` with project overview

#### Step 1.1.2: Choose Monorepo Tool
1. Evaluate Turborepo vs Nx based on project needs
   - **Turborepo**: Simpler, faster builds, good for smaller teams
   - **Nx**: More features, better for larger teams, built-in generators
2. Install chosen tool and configure it
3. Create `turbo.json` (if Turborepo) or `nx.json` (if Nx) configuration
4. Set up build pipeline definitions

#### Step 1.1.3: Create Directory Structure
1. Create `apps/` directory
   - Create `apps/web/` for Next.js frontend
   - Create `apps/api/` for NestJS backend
2. Create `packages/` directory
   - Create `packages/shared/` for shared types and utilities
   - Create `packages/database/` for database schema and migrations
   - Create `packages/config/` for shared configuration files
3. Create `.github/workflows/` for CI/CD pipelines
4. Create `docker/` directory for Docker-related files

#### Step 1.1.4: Configure TypeScript
1. Create root `tsconfig.json` with base configuration
2. Set up TypeScript path aliases for shared packages
3. Create `tsconfig.base.json` with shared compiler options
4. Configure path mappings for `@shared/*`, `@database/*`, `@config/*`
5. Create app-specific `tsconfig.json` files that extend the base config

#### Step 1.1.5: Set Up Shared Package Structure
1. Initialize `packages/shared/package.json`
2. Create shared types directory structure
3. Create shared utilities directory
4. Set up package exports for clean imports
5. Configure build scripts for shared packages

### Acceptance Criteria
- [ ] Monorepo structure is created and organized
- [ ] All packages can be built from root
- [ ] TypeScript path aliases work correctly
- [ ] Shared packages can be imported in apps
- [ ] Build tool (Turborepo/Nx) is configured and working

---

## Task 1.2: Database & ORM Setup

### Objective
Set up PostgreSQL database with ORM (Prisma or Drizzle) and create all core schema migrations.

### Step-by-Step Execution

#### Step 1.2.1: Choose ORM
1. Evaluate Prisma vs Drizzle
   - **Prisma**: More mature, better tooling, easier migrations
   - **Drizzle**: More lightweight, better TypeScript support, more SQL-like
2. Install chosen ORM in `packages/database/`
3. Configure ORM connection settings

#### Step 1.2.2: Set Up Database Package
1. Create `packages/database/package.json`
2. Install database dependencies (ORM, PostgreSQL driver)
3. Create database configuration module
4. Set up environment variable handling for database connection
5. Create database client initialization file

#### Step 1.2.3: Design Database Schema
1. Review entity requirements from Software_Doc.md:
   - Workspace
   - User
   - Integration
   - AlertEvent
   - AlertGroup
   - RoutingRule
   - NotificationLog
2. Design relationships between entities
3. Plan indexes for frequently queried fields
4. Consider data types and constraints

#### Step 1.2.4: Create Schema Definitions
1. Create schema file for each entity
2. Define all fields with appropriate types
3. Set up foreign key relationships
4. Add indexes on:
   - `AlertGroup.group_key`
   - `AlertGroup.workspace_id`
   - `AlertGroup.status`
   - `AlertEvent.workspace_id`
   - `AlertEvent.source_event_id` (for idempotency)
5. Add timestamps (created_at, updated_at) to all tables
6. Add soft delete support if needed

#### Step 1.2.5: Set Up Migrations
1. Initialize migration system
2. Create initial migration with all tables
3. Set up migration scripts in package.json
4. Configure migration directory structure
5. Test migration up and down

#### Step 1.2.6: Configure Connection Pooling
1. Set up connection pool configuration
2. Configure pool size based on expected load
3. Set connection timeout settings
4. Configure retry logic for connection failures

#### Step 1.2.7: Create Database Seed Script
1. Create seed data for development
2. Include sample workspace
3. Include sample users with different roles
4. Include sample integrations (for testing)
5. Create seed script in package.json
6. Document seed data structure

#### Step 1.2.8: Set Up Database Client Export
1. Create database client instance
2. Export types for use in other packages
3. Create helper functions for common queries
4. Set up transaction helpers

### Acceptance Criteria
- [ ] Database schema matches all entity requirements
- [ ] All migrations run successfully
- [ ] Foreign key relationships are enforced
- [ ] Indexes are created on key fields
- [ ] Seed script populates development database
- [ ] Database client can be imported and used in other packages
- [ ] Connection pooling is configured

---

## Task 1.3: Authentication & Authorization

### Objective
Implement authentication system with workspace-based multi-tenancy and role-based access control.

### Step-by-Step Execution

#### Step 1.3.1: Choose Authentication Provider
1. Evaluate Clerk vs Auth.js (NextAuth)
   - **Clerk**: Managed service, faster setup, built-in UI components
   - **Auth.js**: More control, self-hosted, more configuration needed
2. Install chosen authentication library
3. Set up authentication provider configuration

#### Step 1.3.2: Configure Authentication in Backend
1. Create `apps/api/src/auth/` module directory
2. Set up authentication module in NestJS
3. Configure authentication strategy (JWT, session, etc.)
4. Create authentication guards
5. Set up passport strategies if using Auth.js

#### Step 1.3.3: Implement User Management
1. Create user service for user CRUD operations
2. Implement user registration flow
3. Implement user login flow
4. Set up password hashing (if using email/password)
5. Implement OAuth flows (Google, GitHub) if needed
6. Create user profile endpoints

#### Step 1.3.4: Implement Workspace Multi-Tenancy
1. Create workspace service
2. Implement workspace creation on user signup
3. Create workspace context middleware
4. Inject workspace ID into request context
5. Ensure all queries are workspace-scoped
6. Create workspace switching logic (if multi-workspace support needed)

#### Step 1.3.5: Implement Role-Based Access Control (RBAC)
1. Define roles: owner, admin, member
2. Create role enum/constants
3. Create role guard decorator
4. Implement permission checking logic
5. Create role-based route protection
6. Set up default role assignment (owner on workspace creation)

#### Step 1.3.6: Create Authentication Middleware
1. Create authentication middleware to verify tokens/sessions
2. Extract user information from token/session
3. Load user and workspace context
4. Attach user and workspace to request object
5. Handle authentication errors gracefully

#### Step 1.3.7: Set Up Session Management
1. Configure session storage (if using sessions)
2. Set up session expiration
3. Implement refresh token logic (if using JWT)
4. Create logout functionality
5. Handle token/session invalidation

#### Step 1.3.8: Create Authentication API Endpoints
1. `POST /api/auth/register` - User registration
2. `POST /api/auth/login` - User login
3. `POST /api/auth/logout` - User logout
4. `GET /api/auth/me` - Get current user
5. `GET /api/auth/workspace` - Get current workspace
6. OAuth callback endpoints if using OAuth

### Acceptance Criteria
- [ ] Users can register and login
- [ ] Workspace is automatically created on signup
- [ ] User is assigned owner role in their workspace
- [ ] Authentication middleware protects routes
- [ ] Role-based guards prevent unauthorized access
- [ ] Workspace context is available in all requests
- [ ] Sessions/tokens are properly managed
- [ ] OAuth flows work (if implemented)

---

## Task 1.4: Backend API Foundation

### Objective
Set up NestJS backend with proper structure, error handling, validation, and API documentation.

### Step-by-Step Execution

#### Step 1.4.1: Initialize NestJS Application
1. Create NestJS project in `apps/api/`
2. Install NestJS CLI and core dependencies
3. Set up main application module
4. Configure application entry point (`main.ts`)
5. Set up application port and host configuration

#### Step 1.4.2: Configure Application Structure
1. Create module-based directory structure:
   - `src/common/` - Shared utilities, filters, guards
   - `src/config/` - Configuration modules
   - `src/auth/` - Authentication module
   - `src/workspaces/` - Workspace module
   - `src/users/` - User module
2. Set up feature modules following NestJS conventions
3. Create shared module for common functionality

#### Step 1.4.3: Set Up Environment Configuration
1. Install and configure `@nestjs/config` module
2. Create environment variable schema
3. Create `.env.example` file with all required variables
4. Set up environment validation
5. Create config service for type-safe config access
6. Document all environment variables

#### Step 1.4.4: Implement Global Exception Filter
1. Create custom exception filter
2. Handle different exception types:
   - Validation errors
   - Authentication errors
   - Authorization errors
   - Database errors
   - Generic application errors
3. Format error responses consistently
4. Log errors appropriately
5. Register filter globally

#### Step 1.4.5: Set Up Request Validation
1. Install `class-validator` and `class-transformer`
2. Create DTOs (Data Transfer Objects) for requests
3. Set up global validation pipe
4. Configure validation error messages
5. Create custom validators if needed

#### Step 1.4.6: Set Up API Documentation
1. Install Swagger/OpenAPI dependencies
2. Configure Swagger module
3. Add API decorators to controllers
4. Document request/response schemas
5. Set up Swagger UI endpoint
6. Add authentication documentation

#### Step 1.4.7: Create Health Check Endpoints
1. Create `/health` endpoint for basic health check
2. Create `/ready` endpoint for readiness check
3. Include database connection status
4. Include Redis connection status (if applicable)
5. Return appropriate HTTP status codes

#### Step 1.4.8: Set Up CORS Configuration
1. Configure CORS middleware
2. Set allowed origins (environment-based)
3. Configure allowed methods and headers
4. Set up credentials handling

#### Step 1.4.9: Create Base Controller and Service Patterns
1. Create base controller with common functionality
2. Create base service with common CRUD operations
3. Set up pagination helpers
4. Create response formatting utilities
5. Document patterns for team consistency

#### Step 1.4.10: Set Up Logging
1. Install logging library (Winston or Pino)
2. Configure log levels
3. Set up structured logging
4. Create log format for development and production
5. Set up request logging middleware
6. Configure log output (console, file, etc.)

### Acceptance Criteria
- [ ] NestJS application starts successfully
- [ ] All modules are properly structured
- [ ] Environment variables are validated on startup
- [ ] Global exception filter handles all error types
- [ ] Request validation works on all endpoints
- [ ] Swagger documentation is accessible
- [ ] Health check endpoints return correct status
- [ ] CORS is properly configured
- [ ] Logging is working and structured

---

## Task 1.5: Frontend Foundation

### Objective
Set up Next.js frontend with authentication, protected routes, UI components, and state management.

### Step-by-Step Execution

#### Step 1.5.1: Initialize Next.js Application
1. Create Next.js 14+ project in `apps/web/` with App Router
2. Install Next.js dependencies
3. Configure TypeScript
4. Set up basic project structure
5. Configure Next.js config file

#### Step 1.5.2: Set Up Authentication Integration
1. Install authentication library (Clerk SDK or NextAuth)
2. Configure authentication provider
3. Set up authentication context/provider
4. Create authentication hooks
5. Implement session management

#### Step 1.5.3: Create Authentication Pages
1. Create login page (`/app/login/page.tsx`)
2. Create signup page (`/app/signup/page.tsx`)
3. Create forgot password page (if needed)
4. Style authentication pages
5. Add form validation
6. Handle authentication errors

#### Step 1.5.4: Implement Protected Route Middleware
1. Create middleware for route protection
2. Check authentication status
3. Redirect unauthenticated users to login
4. Handle authentication state loading
5. Protect all dashboard routes

#### Step 1.5.5: Set Up Workspace Context
1. Create workspace context provider
2. Fetch current workspace on app load
3. Store workspace in context
4. Create workspace switching UI (if needed)
5. Handle workspace loading states

#### Step 1.5.6: Choose and Set Up UI Component Library
1. Evaluate UI libraries (shadcn/ui, Chakra UI, Material UI)
2. Install chosen library
3. Set up theme configuration
4. Configure design tokens (colors, spacing, typography)
5. Create base layout components

#### Step 1.5.7: Create Base Layout Structure
1. Create root layout (`app/layout.tsx`)
2. Create dashboard layout with sidebar/navigation
3. Create header component with user menu
4. Create sidebar navigation
5. Set up responsive design
6. Add loading states

#### Step 1.5.8: Set Up State Management
1. Choose state management solution (Zustand, React Query, Redux)
2. Install and configure chosen solution
3. Set up API client for backend communication
4. Create API hooks for common operations
5. Set up error handling for API calls
6. Configure request/response interceptors

#### Step 1.5.9: Create Shared Components
1. Create button component
2. Create input component
3. Create card component
4. Create table component
5. Create modal/dialog component
6. Create loading spinner component
7. Create error message component

#### Step 1.5.10: Set Up Environment Configuration
1. Create `.env.local.example` file
2. Configure API base URL
3. Set up authentication configuration
4. Document all frontend environment variables
5. Set up environment variable validation

#### Step 1.5.11: Create Basic Dashboard Shell
1. Create dashboard page (`/app/dashboard/page.tsx`)
2. Add placeholder content
3. Set up page structure
4. Add navigation links
5. Test protected route access

### Acceptance Criteria
- [ ] Next.js application runs successfully
- [ ] Authentication pages are functional
- [ ] Protected routes redirect unauthenticated users
- [ ] Workspace context is available throughout app
- [ ] UI component library is set up and working
- [ ] Base layout and navigation are functional
- [ ] State management is configured
- [ ] API client can communicate with backend
- [ ] Dashboard shell is accessible to authenticated users

---

## Task 1.6: Queue System Setup

### Objective
Set up BullMQ with Redis for background job processing (notifications, escalations, alert processing).

### Step-by-Step Execution

#### Step 1.6.1: Set Up Redis
1. Configure Redis in Docker Compose (or use managed Redis)
2. Set up Redis connection configuration
3. Test Redis connection
4. Configure Redis persistence if needed
5. Set up Redis connection pooling

#### Step 1.6.2: Install and Configure BullMQ
1. Install BullMQ and Redis client in backend
2. Create queue module in NestJS
3. Set up Redis connection for BullMQ
4. Configure BullMQ connection options
5. Set up connection error handling

#### Step 1.6.3: Create Queue Definitions
1. Create `notifications` queue for Slack message sending
2. Create `escalations` queue for delayed escalation jobs
3. Create `alert-processing` queue for alert normalization and grouping
4. Configure queue options (concurrency, retry, etc.)
5. Set up queue naming conventions

#### Step 1.6.4: Create Queue Service
1. Create queue service module
2. Implement queue registration
3. Create helper methods for adding jobs
4. Set up job data typing
5. Create queue monitoring utilities

#### Step 1.6.5: Set Up Queue Processors
1. Create processor structure for each queue
2. Set up error handling in processors
3. Configure retry logic
4. Set up job logging
5. Create processor registration system

#### Step 1.6.6: Set Up Queue Dashboard (Optional)
1. Install Bull Board or similar dashboard
2. Configure dashboard endpoint
3. Set up authentication for dashboard
4. Test queue visualization

#### Step 1.6.7: Create Queue Health Checks
1. Add queue health check to health endpoint
2. Check Redis connection status
3. Monitor queue depth
4. Alert on queue failures

### Acceptance Criteria
- [ ] Redis is running and accessible
- [ ] BullMQ is connected to Redis
- [ ] All three queues are created and registered
- [ ] Jobs can be added to queues
- [ ] Queue processors can process jobs
- [ ] Retry logic works correctly
- [ ] Queue health checks pass
- [ ] Queue dashboard is accessible (if implemented)

---

## Task 1.7: CI/CD Pipeline

### Objective
Set up GitHub Actions CI pipeline for automated testing, linting, type checking, and build verification.

### Step-by-Step Execution

#### Step 1.7.1: Set Up GitHub Actions Workflow
1. Create `.github/workflows/` directory
2. Create `ci.yml` workflow file
3. Configure workflow triggers (on push, on pull_request)
4. Set up workflow permissions

#### Step 1.7.2: Configure Linting Stage
1. Set up ESLint configuration
2. Create lint job in workflow
3. Configure lint rules
4. Set up lint caching
5. Fail workflow on lint errors

#### Step 1.7.3: Configure Type Checking Stage
1. Create typecheck job
2. Run TypeScript compiler in check mode
3. Set up typecheck caching
4. Fail workflow on type errors

#### Step 1.7.4: Configure Testing Stage
1. Set up test framework (Jest or Vitest)
2. Create test job in workflow
3. Configure test coverage reporting
4. Set up test caching
5. Run tests for all packages

#### Step 1.7.5: Configure Build Stage
1. Create build job for each app
2. Build frontend application
3. Build backend application
4. Build shared packages
5. Verify all builds succeed
6. Cache build artifacts

#### Step 1.7.6: Set Up Job Dependencies
1. Configure job dependencies (lint → typecheck → test → build)
2. Set up parallel jobs where possible
3. Configure job matrix for multiple Node versions (if needed)

#### Step 1.7.7: Configure Environment Variables
1. Set up GitHub Secrets for CI
2. Configure database connection for tests
3. Set up Redis connection for tests
4. Document required secrets

#### Step 1.7.8: Add Status Badges
1. Create workflow status badge
2. Add badge to README
3. Configure badge to show latest status

### Acceptance Criteria
- [ ] CI pipeline runs on every PR
- [ ] Linting stage catches code style issues
- [ ] Type checking catches type errors
- [ ] Tests run and report results
- [ ] Build stage verifies all packages build
- [ ] Pipeline fails appropriately on errors
- [ ] Pipeline passes on clean code
- [ ] Status badge shows current pipeline status

---

## Task 1.8: Docker & Local Development

### Objective
Set up Docker Compose for local development with all required services and create development scripts.

### Step-by-Step Execution

#### Step 1.8.1: Create Docker Compose File
1. Create `docker-compose.yml` in root
2. Define PostgreSQL service
   - Set up database name, user, password
   - Configure volume for data persistence
   - Set up port mapping
3. Define Redis service
   - Configure port mapping
   - Set up volume for data persistence
4. Configure service dependencies
5. Set up environment variables

#### Step 1.8.2: Create Dockerfiles
1. Create `Dockerfile` for backend API
   - Use Node.js base image
   - Set up working directory
   - Copy package files
   - Install dependencies
   - Copy source code
   - Set up build and start commands
2. Create `Dockerfile` for frontend web
   - Use Node.js base image
   - Set up build stage
   - Set up production stage
   - Optimize image size
3. Create `.dockerignore` files

#### Step 1.8.3: Set Up Development Scripts
1. Create root `package.json` scripts:
   - `dev` - Start all services in development mode
   - `dev:api` - Start only API
   - `dev:web` - Start only web
   - `dev:db` - Start only database services
2. Create database scripts:
   - `db:migrate` - Run migrations
   - `db:seed` - Seed database
   - `db:reset` - Reset database
3. Create build scripts:
   - `build` - Build all packages
   - `build:api` - Build API
   - `build:web` - Build web

#### Step 1.8.4: Create Environment Files
1. Create `.env.example` with all required variables
2. Create `.env.local` for local development
3. Document all environment variables
4. Set up different env files for different environments

#### Step 1.8.5: Set Up Database Initialization
1. Create database initialization script
2. Set up automatic migration on container start (optional)
3. Configure database connection retry logic
4. Set up database health checks

#### Step 1.8.6: Create Development Documentation
1. Document local setup process
2. Create troubleshooting guide
3. Document common development tasks
4. Add development best practices

#### Step 1.8.7: Test Local Development Setup
1. Test Docker Compose startup
2. Verify all services are accessible
3. Test database connection
4. Test Redis connection
5. Test API startup
6. Test frontend startup
7. Verify hot reload works

### Acceptance Criteria
- [ ] Docker Compose starts all services successfully
- [ ] Database is accessible and migrations run
- [ ] Redis is accessible
- [ ] Backend API runs in Docker
- [ ] Frontend runs in Docker
- [ ] Development scripts work correctly
- [ ] Hot reload works for development
- [ ] All environment variables are documented
- [ ] Local setup documentation is complete

---

## Phase 1 Completion Checklist

### Infrastructure
- [ ] Monorepo structure is complete and functional
- [ ] All packages can be built and imported correctly
- [ ] TypeScript configuration is working across all packages

### Database
- [ ] Database schema matches all requirements
- [ ] All migrations run successfully
- [ ] Seed data populates development database
- [ ] Database client is usable in other packages

### Authentication
- [ ] Users can register and login
- [ ] Workspace multi-tenancy is working
- [ ] RBAC is implemented and tested
- [ ] Protected routes work correctly

### Backend
- [ ] NestJS application structure is complete
- [ ] Error handling is implemented
- [ ] Request validation works
- [ ] API documentation is accessible
- [ ] Health checks are working

### Frontend
- [ ] Next.js application is set up
- [ ] Authentication pages work
- [ ] Protected routes redirect correctly
- [ ] UI component library is integrated
- [ ] State management is configured
- [ ] Dashboard shell is accessible

### Queue System
- [ ] Redis is running
- [ ] BullMQ queues are created
- [ ] Queue processors are set up
- [ ] Jobs can be processed

### CI/CD
- [ ] CI pipeline runs on PRs
- [ ] All checks pass on clean code
- [ ] Pipeline fails appropriately on errors

### Local Development
- [ ] Docker Compose works
- [ ] All services start correctly
- [ ] Development scripts are functional
- [ ] Documentation is complete

---

## Next Steps After Phase 1

Once Phase 1 is complete, you're ready to move to Phase 2: Core Alert Processing, which will build upon this foundation to implement:
- Sentry webhook ingestion
- Alert normalization
- Alert deduplication and grouping
- Alert storage and retrieval

---

## Troubleshooting Common Issues

### Monorepo Build Issues
- Verify TypeScript path aliases are correct
- Check that all packages are listed in workspace configuration
- Ensure build tool (Turborepo/Nx) is properly configured

### Database Connection Issues
- Verify PostgreSQL is running
- Check connection string in environment variables
- Verify network connectivity between services
- Check database logs for errors

### Authentication Issues
- Verify authentication provider configuration
- Check environment variables for auth secrets
- Verify callback URLs are correctly configured
- Check session/token storage

### Queue Processing Issues
- Verify Redis is running and accessible
- Check BullMQ connection configuration
- Review queue processor logs
- Verify job data structure matches processor expectations

---

## Estimated Time Breakdown

- Task 1.1 (Monorepo Setup): 4-6 hours
- Task 1.2 (Database & ORM): 6-8 hours
- Task 1.3 (Authentication): 8-10 hours
- Task 1.4 (Backend Foundation): 6-8 hours
- Task 1.5 (Frontend Foundation): 8-10 hours
- Task 1.6 (Queue System): 4-6 hours
- Task 1.7 (CI/CD): 3-4 hours
- Task 1.8 (Docker & Local Dev): 4-6 hours

**Total Estimated Time**: 43-58 hours (approximately 1.5-2 weeks for one developer)

---

## Notes

- This phase focuses on infrastructure and foundation. No business logic for alerts is implemented yet.
- All decisions made in this phase (ORM choice, auth provider, etc.) will impact subsequent phases.
- Take time to get the foundation right - it's easier to build on solid ground.
- Document any deviations from this plan for future reference.

