# Phase Completion Guide

This guide outlines the process for completing each phase and creating structured pull requests.

## Repository Structure

```
SignalCraft/
├── .github/
│   ├── PR_TEMPLATE.md
│   ├── COMMIT_CONVENTIONS.md
│   └── workflows/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── shared/
│   ├── database/
│   └── config/
└── docs/
    ├── Phase1_Execution_Plan.md
    ├── Phase2_Execution_Plan.md
    └── ...
```

## Phase Completion Workflow

### 1. Before Starting a Phase

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create phase branch
git checkout -b phase[X]/[phase-name]
# Example: git checkout -b phase1/foundation
```

### 2. During Phase Development

- Make commits following [commit conventions](.github/COMMIT_CONVENTIONS.md)
- Commit frequently with meaningful messages
- Push to your branch regularly
- Keep commits focused and atomic

### 3. Phase Completion Checklist

Before creating a PR, ensure:

#### Code Quality

- [ ] All code follows project style guide
- [ ] No console.logs or debug code
- [ ] No commented-out code
- [ ] Error handling is comprehensive
- [ ] Code is properly documented

#### Testing

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests written (if applicable)
- [ ] Test coverage meets requirements
- [ ] All tests pass in CI

#### Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Code comments added where needed
- [ ] Architecture diagrams updated (if applicable)
- [ ] Phase execution plan marked complete

#### Acceptance Criteria

- [ ] All phase acceptance criteria met
- [ ] All tasks in execution plan completed
- [ ] No known critical bugs
- [ ] Performance benchmarks met (if applicable)

### 4. Creating the Pull Request

#### Step 1: Finalize Your Branch

```bash
# Ensure all changes are committed
git status

# Push final changes
git push origin phase[X]/[phase-name]
```

#### Step 2: Create PR on GitHub

1. Go to https://github.com/gkganesh12/SignalCraft
2. Click "New Pull Request"
3. Select your phase branch
4. Use PR template (auto-filled)
5. Fill in all sections:
   - Phase Information
   - Summary
   - Changes Made (checklist)
   - Testing (with metrics)
   - Checklist (verify all items)
   - Breaking Changes (if any)
   - Next Steps
   - Related Issues

#### Step 3: PR Title Format

```
Phase [X]: [Phase Name] - [Brief Description]
```

Examples:

- `Phase 1: Foundation & Infrastructure - Complete`
- `Phase 2: Core Alert Processing - Complete`
- `Phase 3: Integrations & Notifications - Complete`

#### Step 4: PR Description

Use the PR template and fill in:

- **Phase Information**: Phase number, name, timeline
- **Summary**: 2-3 sentence overview
- **Changes Made**: Detailed checklist of features
- **Testing**: Test coverage and results
- **Checklist**: Verify all items checked
- **Breaking Changes**: Document any breaking changes
- **Next Steps**: What's needed for next phase

### 5. PR Review Process

#### Self-Review Checklist

- [ ] PR title follows convention
- [ ] PR description is complete
- [ ] All checklist items checked
- [ ] Code is clean and follows conventions
- [ ] Tests are passing
- [ ] Documentation is updated

#### Review Request

- Request review from team members
- Add appropriate labels:
  - `phase-1`, `phase-2`, etc.
  - `ready-for-review`
  - `needs-testing` (if applicable)

### 6. After PR Approval

#### Merge Strategy

```bash
# After PR is approved, merge via GitHub UI
# Or use squash merge for cleaner history
```

#### Tagging Release

```bash
# After merge, create a tag
git checkout main
git pull origin main
git tag -a phase[X]-v1.0.0 -m "Phase [X] completion: [Phase Name]"
git push origin phase[X]-v1.0.0
```

#### Post-Merge Tasks

- [ ] Update project board (if using)
- [ ] Close related issues
- [ ] Update documentation index
- [ ] Announce phase completion (if applicable)

## Phase-Specific PR Guidelines

### Phase 1: Foundation & Infrastructure

**Focus**: Setup, structure, basic infrastructure
**Key Sections**:

- Monorepo setup
- Database schema
- Authentication
- Basic API/Frontend
- CI/CD pipeline

### Phase 2: Core Alert Processing

**Focus**: Alert ingestion, normalization, grouping
**Key Sections**:

- Webhook endpoints
- Normalization service
- Deduplication engine
- Alert storage
- Processing pipeline

### Phase 3: Integrations & Notifications

**Focus**: Slack integration, notifications
**Key Sections**:

- Slack OAuth
- Notification service
- Interactive actions
- Notification logging

### Phase 4: Routing Rules & Alert Hygiene

**Focus**: Rules engine, escalation, hygiene
**Key Sections**:

- Routing rules engine
- Rules API
- Rules UI
- Escalation system
- Alert hygiene

### Phase 5: Frontend Dashboard & UI

**Focus**: User interface, dashboards
**Key Sections**:

- Overview dashboard
- Alert inbox
- Alert detail pages
- Integration management
- Settings pages

### Phase 6: Production Hardening

**Focus**: Security, performance, monitoring
**Key Sections**:

- Security enhancements
- Error handling
- Performance optimization
- Monitoring setup
- Data retention

### Phase 7: Testing & Validation

**Focus**: Comprehensive testing
**Key Sections**:

- Unit tests
- Integration tests
- E2E tests
- Load testing
- Demo environment

### Phase 8: Deployment & Production

**Focus**: Production deployment
**Key Sections**:

- Infrastructure as Code
- Deployment pipeline
- Environment configuration
- Database migrations
- Backup & DR
- Production monitoring

## Commit Examples by Phase

### Phase 1

```bash
feat(phase1): setup monorepo structure with Turborepo
feat(phase1): add PostgreSQL database schema
feat(phase1): implement authentication with Clerk
feat(phase1): setup NestJS backend foundation
feat(phase1): setup Next.js frontend foundation
feat(phase1): configure CI/CD pipeline
```

### Phase 2

```bash
feat(phase2): implement Sentry webhook endpoint
feat(phase2): create alert normalization service
feat(phase2): implement alert deduplication engine
feat(phase2): add alert storage service
feat(phase2): create alert processing pipeline
```

### Phase 3

```bash
feat(phase3): implement Slack OAuth integration
feat(phase3): create Slack notification service
feat(phase3): add interactive Slack actions
feat(phase3): implement notification logging
```

## Best Practices

1. **Commit Often**: Make small, focused commits
2. **Write Good Messages**: Follow commit conventions
3. **Test Before Committing**: Ensure tests pass locally
4. **Update Documentation**: Keep docs in sync with code
5. **Review Your Own PR**: Self-review before requesting review
6. **Be Descriptive**: PR descriptions should be comprehensive
7. **Link Issues**: Reference related issues in PRs
8. **Tag Releases**: Tag each phase completion

## Troubleshooting

### PR Failing CI Checks

- Review CI logs
- Fix failing tests
- Ensure code follows conventions
- Update and push again

### Merge Conflicts

```bash
git checkout main
git pull origin main
git checkout phase[X]/[phase-name]
git rebase main
# Resolve conflicts
git push origin phase[X]/[phase-name] --force-with-lease
```

### Need to Update PR

- Make changes on your branch
- Commit and push
- PR will automatically update

## Resources

- [Commit Conventions](.github/COMMIT_CONVENTIONS.md)
- [PR Template](.github/PR_TEMPLATE.md)
- [Phase Execution Plans](../docs/)
