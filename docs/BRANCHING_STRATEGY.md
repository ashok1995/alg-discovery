# Branching Strategy

## Overview

Three-branch flow for safe deployments with staging validation before production.

| Branch   | Purpose                    | Deploy To |
|----------|----------------------------|-----------|
| `main`   | Production-ready code only | Prod      |
| `develop`| Staging / integration      | Staging   |
| `feature/*` | New work               | —         |

---

## Flow

```
feature/xyz  →  develop (staging)  →  main (prod)
                     ↓
              Test locally / stage first
              If OK → merge to main
```

1. **Feature work** on `feature/*` branches
2. **Merge to `develop`** for staging deployment and integration testing
3. **Merge to `main`** only after staging is validated
4. **Prod deployment** from `main` only

---

## Workflow

### New feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# ... work ...
git add .
git commit -m "feat: description"
git push -u origin feature/my-feature
# Open MR: feature/my-feature → develop
```

### Staging (after MR to develop)

```bash
# On GCP or local
git checkout develop
git pull origin develop
./scripts/deploy-from-git.sh stage
# Verify at stage URL
```

### Prod (after staging OK)

```bash
# Open MR: develop → main
# Merge on GitHub/GitLab
# Then deploy
git checkout main
git pull origin main
./scripts/deploy-from-git.sh prod
```

---

## Rollback

If a prod deployment fails, roll back to the second latest version:

```bash
# On GCP instance
cd ~/alg-discovery
git log --oneline -3   # See recent commits
git checkout main
git reset --hard <previous-commit-hash>   # Second latest before bad deploy
./scripts/deploy-from-git.sh prod
# Optionally: git push origin main --force  (only if main was already pushed)
```

**Safer approach**: Tag before each prod deploy, then rollback by checking out the previous tag:

```bash
git tag prod-v1.2.3   # Before deploy
./scripts/deploy-from-git.sh prod
# If fail:
git checkout prod-v1.2.2
./scripts/deploy-from-git.sh prod
```

---

## One-time setup

Create `develop` from `main` (do this after merging the first MR to main):

```bash
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

---

## Summary

- **develop** = staging, integration, test before prod
- **main** = prod only, deploy only when staging is OK
- **Rollback** = checkout previous tag/commit and redeploy
