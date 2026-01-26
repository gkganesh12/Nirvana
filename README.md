# Nirvana

A lightweight "done-right" layer on top of existing monitoring tools that **reduces alert noise, prevents missed critical alerts, and makes incidents actionable** — without needing a full SRE/DevOps team.

## 🎯 Overview

SignalCraft is NOT "another Datadog/Sentry." It's a **better alerting outcomes** system (signal, routing, runbooks, accountability) using what teams already have.

## ✨ Key Features

- **Unified Alert Inbox**: Ingest alerts from multiple sources (Sentry, Datadog, etc.)
- **Intelligent Deduplication**: Group similar alerts to reduce noise by 60-90%
- **Smart Routing**: Route alerts to appropriate Slack channels based on rules
- **Interactive Actions**: ACK, Snooze, and Resolve alerts directly from Slack
- **Escalation System**: Automatically escalate unacknowledged alerts
- **Dashboard & Analytics**: Track alert metrics and deduplication effectiveness

## 🏗️ Architecture

```
┌─────────────┐
│   Next.js   │  Frontend (Dashboard, Alert Inbox, Rules Management)
│   Frontend  │
└──────┬──────┘
       │
       │ REST API
       │
┌──────▼──────┐
│   NestJS    │  Backend API (Webhooks, Rules Engine, Notifications)
│   Backend   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Postgres│ │Redis │  Data & Queue (BullMQ for jobs)
└───────┘ └──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Sentry│ │Slack│  External Integrations
└──────┘ └─────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Clone the repository
git clone https://github.com/gkganesh12/SignalCraft.git
cd SignalCraft

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development environment
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development servers
npm run dev
```

## 📁 Project Structure

```
SignalCraft/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── database/     # Database schema and migrations
│   └── config/       # Shared configuration
├── docs/             # Documentation
│   ├── Phase1_Execution_Plan.md
│   ├── Phase2_Execution_Plan.md
│   └── ...
└── .github/          # GitHub workflows and templates
```

## 🗺️ Development Phases

SignalCraft is being developed in 8 phases:

- **Phase 1**: Foundation & Infrastructure ✅
- **Phase 2**: Core Alert Processing ✅
- **Phase 3**: Integrations & Notifications ✅
- **Phase 4**: Routing Rules & Alert Hygiene ✅
- **Phase 5**: Frontend Dashboard & UI ✅
- **Phase 6**: Production Hardening ✅
- **Phase 7**: Testing & Validation ✅
- **Phase 8**: Deployment & Production Setup ✅

See [Phase Completion Guide](.github/PHASE_COMPLETION_GUIDE.md) for details on contributing.

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

## 📚 Documentation

- [Software Documentation](Software_Doc.md)
- [Phase Execution Plans](docs/)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)

## 🤝 Contributing

1. Check out the [Phase Completion Guide](.github/PHASE_COMPLETION_GUIDE.md)
2. Follow [Commit Conventions](.github/COMMIT_CONVENTIONS.md)
3. Create a branch: `git checkout -b phase[X]/[feature-name]`
4. Make your changes and commit following conventions
5. Push and create a PR using the [PR Template](.github/PR_TEMPLATE.md)

## 📝 License

[Add your license here]

## 🔗 Links

- Repository: https://github.com/gkganesh12/SignalCraft
- Documentation: [Add docs link]
- Issues: https://github.com/gkganesh12/SignalCraft/issues

## 🙏 Acknowledgments

Built with ❤️ for teams that need better alerting without the complexity.
