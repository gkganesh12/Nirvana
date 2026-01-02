# Commit Message Conventions

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, build config, etc.
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

## Scopes

- `phase1`: Phase 1 related
- `phase2`: Phase 2 related
- `phase3`: Phase 3 related
- `phase4`: Phase 4 related
- `phase5`: Phase 5 related
- `phase6`: Phase 6 related
- `phase7`: Phase 7 related
- `phase8`: Phase 8 related
- `api`: API changes
- `web`: Frontend changes
- `db`: Database changes
- `infra`: Infrastructure changes
- `docs`: Documentation

## Examples

### Feature

```
feat(phase2): implement alert normalization service

- Add normalization service for Sentry alerts
- Map Sentry severity to internal severity levels
- Extract and normalize alert fields
- Add unit tests for normalization logic

Closes #123
```

### Bug Fix

```
fix(phase3): handle Slack API rate limiting errors

- Add retry logic with exponential backoff
- Handle 429 rate limit responses
- Update error messages for better debugging

Fixes #456
```

### Documentation

```
docs(phase1): add setup instructions to README

- Document local development setup
- Add environment variable examples
- Include Docker setup instructions
```

### Refactoring

```
refactor(phase4): optimize routing rules evaluation

- Cache enabled rules per workspace
- Use short-circuit evaluation
- Reduce database queries

Improves performance by 40%
```

## Branch Naming

- `phase1/foundation`
- `phase2/alert-processing`
- `phase3/integrations`
- `phase4/routing-rules`
- `phase5/dashboard-ui`
- `phase6/production-hardening`
- `phase7/testing-validation`
- `phase8/deployment`

## PR Branch Strategy

1. Create branch from `main`: `git checkout -b phase[X]/[feature-name]`
2. Make commits following conventions
3. Push branch: `git push origin phase[X]/[feature-name]`
4. Create PR with template
5. After review and approval, merge to `main`
6. Tag release: `git tag -a phase[X]-v1.0.0 -m "Phase [X] completion"`
