# Dev Branch Record

**Created**: 2026-06-01

---

## Branch Origin

| Item | Value |
|------|-------|
| Branched from | `main` at commit `7bbe0f0` (2026-05-25 20:47) |
| Branch date | 2026-05-25 |
| Current dev HEAD | `7bbe0f0` |
| Current main HEAD | `4259837` |

---

## Branch Relationship

```
7bbe0f0 (dev, HEAD) ──────────────────────────────────→ (future commits on dev)
       │
       └─→ a349976 → e78a95e → 49190e8 → 4259837 (main)
```

- Dev was branched from `main` at commit `7bbe0f0`
- Main has 4 new commits after dev branched

---

## Main Branch New Commits (after dev branched)

| Commit | Date | Description |
|--------|------|-------------|
| `4259837` | 2026-05-31 | docs: sharpen comment guideline with explicit forbidden patterns |
| `49190e8` | 2026-05-31 | fix: retry auto-continue on AI-reported errors until report_to_user is called |
| `e78a95e` | 2026-05-30 | feat: add MCP command blacklist policy, Claude Opus 4.8 support, KaTeX math rendering, IPv4 CIDR browser-view matching, anthropic-to-openai max_tokens forwarding, and overlay build config isolation |
| `a349976` | 2026-05-26 | build |

---

## Future Merge Strategies

### Case 1: Dev has no new commits, update to latest main

```bash
git checkout dev
git merge main
```
- Dev is ancestor of main, merge is **fast-forward**
- Result: dev points to latest main commit

### Case 2: Dev has new commits, main has no new commits

```bash
git checkout dev
git merge main
```
- Dev is ahead, merge is **fast-forward**
- Result: main points to dev (dev's new commits become part of main)

### Case 3: Both dev and main have new commits (recommended strategy)

**Recommended: Rebase dev onto latest main, then merge**

```bash
git checkout dev
git fetch origin
git rebase origin/main
# If conflicts, resolve and git rebase --continue

# Then merge from dev (now fast-forward)
git checkout main
git merge dev --ff-only
```

**Alternative: Merge approach (creates merge commit)**

```bash
git checkout dev
git fetch origin
git merge origin/main
# Resolve conflicts, then git commit

# Later merge to main
git checkout main
git merge dev --no-ff
```

### Recommended Strategy

| Scenario | Recommended Approach | Reason |
|----------|---------------------|--------|
| Dev has no new commits | `git merge main` | Simple fast-forward |
| Dev has new commits, prefer linear history | Rebase then merge | Cleaner linear history |
| Dev has new commits, merge commit is acceptable | `git merge dev --no-ff` | Preserves branch context |

**Best Practice**:
1. Periodically pull updates from main: `git merge main` (on dev)
2. When merging to main, use `--ff-only` or rebase approach

---

## Commit Hash Reference

| Purpose | Hash |
|---------|------|
| Branching point | `7bbe0f00194bcb2046c200b76bfc461e03525ccd` |
| Dev HEAD | `7bbe0f00194bcb2046c200b76bfc461e03525ccd` |
| Main HEAD | `4259837b9e95880e63b6ccf03d6852b091361d7e` |
