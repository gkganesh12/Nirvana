# Repository Setup Guide

This guide will help you set up the SignalCraft repository and understand the commit and PR workflow.

## Initial Repository Setup

### 1. Initialize Repository

```bash
# Navigate to project directory
cd SignalCraft

# Run initialization script
./scripts/init-repo.sh

# Or manually:
git init
git remote add origin https://github.com/gkganesh12/SignalCraft.git
```

### 2. Initial Commit

```bash
# Add all files
git add .

# Make initial commit
git commit -m "chore: initial repository setup

- Add project structure
- Add documentation
- Add GitHub workflows and templates
- Add commit conventions
- Add PR template"

# Push to main branch
git branch -M main
git push -u origin main
```

## Phase-Based Development Workflow

### Starting a New Phase

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Create phase branch
git checkout -b phase[X]/[phase-name]
# Examples:
# git checkout -b phase1/foundation
# git checkout -b phase2/alert-processing
# git checkout -b phase3/integrations

# 3. Start development
# Make changes, commit frequently following conventions
```

### During Phase Development

```bash
# Make commits following conventions
git add .
git commit -m "feat(phase[X]): implement [feature]"

# Push regularly
git push origin phase[X]/[phase-name]
```

### Completing a Phase

```bash
# 1. Ensure all changes are committed
git status

# 2. Push final changes
git push origin phase[X]/[phase-name]

# 3. Create PR on GitHub
# - Go to: https://github.com/gkganesh12/SignalCraft
# - Click "New Pull Request"
# - Select your phase branch
# - Use PR template
# - Fill in all sections

# 4. After PR approval and merge
git checkout main
git pull origin main

# 5. Create phase completion tag
git tag -a phase[X]-v1.0.0 -m "Phase [X] completion: [Phase Name]"
git push origin phase[X]-v1.0.0
```

## Commit Message Examples by Phase

### Phase 1: Foundation

```bash
feat(phase1): setup monorepo structure with Turborepo
feat(phase1): add PostgreSQL database schema
feat(phase1): implement authentication with Clerk
feat(phase1): setup NestJS backend foundation
feat(phase1): setup Next.js frontend foundation
feat(phase1): configure CI/CD pipeline
feat(phase1): add Docker setup for local development
```

### Phase 2: Alert Processing

```bash
feat(phase2): implement Sentry webhook endpoint
feat(phase2): create alert normalization service
feat(phase2): implement alert deduplication engine
feat(phase2): add alert storage service
feat(phase2): create alert processing pipeline
test(phase2): add unit tests for normalization
test(phase2): add integration tests for webhook flow
```

### Phase 3: Integrations

```bash
feat(phase3): implement Slack OAuth integration
feat(phase3): create Slack notification service
feat(phase3): add interactive Slack actions
feat(phase3): implement notification logging
fix(phase3): handle Slack API rate limiting
test(phase3): add tests for Slack integration
```

## PR Template Usage

When creating a PR, the template will be auto-filled. Fill in:

1. **Phase Information**: Phase number, name, timeline
2. **Summary**: Brief overview (2-3 sentences)
3. **Changes Made**: Detailed checklist of what was implemented
4. **Testing**: Test coverage, scenarios tested
5. **Checklist**: Verify all items are checked
6. **Breaking Changes**: Document any breaking changes
7. **Next Steps**: What's needed for next phase

## Branch Protection

Recommended branch protection rules for `main`:

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Require PR template to be filled
- Require linear history (no merge commits)

## Tags and Releases

After each phase completion:

```bash
# Create annotated tag
git tag -a phase[X]-v1.0.0 -m "Phase [X] completion: [Phase Name]"

# Push tag
git push origin phase[X]-v1.0.0

# Create GitHub release from tag
# - Go to Releases
# - Click "Draft a new release"
# - Select the tag
# - Add release notes from PR
```

## Quick Reference

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `chore`: Maintenance

### Branch Naming

- `phase[X]/[feature-name]`
- Examples: `phase1/foundation`, `phase2/alert-processing`

### PR Title Format

- `Phase [X]: [Phase Name] - [Brief Description]`
- Example: `Phase 1: Foundation & Infrastructure - Complete`

## Resources

- [Phase Completion Guide](PHASE_COMPLETION_GUIDE.md)
- [Commit Conventions](COMMIT_CONVENTIONS.md)
- [PR Template](PR_TEMPLATE.md)
- [Repository](https://github.com/gkganesh12/SignalCraft)
