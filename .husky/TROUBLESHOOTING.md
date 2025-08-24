# Git Hooks Troubleshooting Guide

> ADHD-Friendly Troubleshooting for Development Quality Tools
> Last Updated: 2025-08-24

## Quick Fix Checklist

**Before diving deep, try these 3 steps:**

1. **🔄 Reinstall hooks**: `bun install` (runs `husky` automatically)
2. **✅ Check permissions**: `ls -la .husky/pre-*` (should show `x` permission)
3. **🧹 Format code**: `bun run format` (fixes most formatting issues)

---

## Common Issues & Solutions

### 🚫 "Pre-commit hook failed"

**Symptoms:**

- Commit is blocked
- See error messages about formatting, linting, or type errors

**Quick Fixes:**

1. **Auto-fix formatting**: `bun run format`
2. **Auto-fix linting**: `bun run lint`
3. **Check types**: `bun run typecheck`
4. **Run all checks**: `bun run check`

**If still failing:**

- Look at the specific error message
- Fix the highlighted file/line
- Try committing again

### 🐌 "Hooks are running slowly"

**Expected Performance:**

- Pre-commit: < 30 seconds for typical changes
- Pre-push: < 2 minutes for full validation

**Solutions:**

1. **Check what's staged**: `git status` (hooks only run on staged files)
2. **Clear cache**: `rm -rf node_modules/.cache`
3. **Optimize**: Stage only necessary files

**Performance Tips:**

- Stage smaller changesets when possible
- Use `git add -p` to stage specific chunks
- Commit related changes together

### 🔧 "Command not found" Errors

**Common Missing Commands:**

- `prettier`: Run `bun install`
- `eslint`: Run `bun install`
- `tsc`: Run `bun install`

**Solutions:**

1. **Reinstall dependencies**: `bun install`
2. **Check Node version**: `node --version` (need >=22.11.0)
3. **Clear cache and reinstall**: `rm -rf node_modules && bun install`

### 💥 "Pre-push hook failed"

**This runs comprehensive checks before pushing**

**Common Causes:**

- Type errors in any file
- Linting errors with warnings
- Test failures
- Build failures

**Solutions:**

1. **Run local checks**: `bun run check`
2. **Fix each error individually**:
   - Format: `bun run format`
   - Lint: `bun run lint`
   - Types: `bun run typecheck`
   - Tests: `bun run test:smoke`

### 🔄 "Hooks not running at all"

**Symptoms:**

- Can commit without any validation
- No hook output during git operations

**Solutions:**

1. **Reinstall hooks**: `bun run prepare`
2. **Check hook files exist**: `ls -la .husky/`
3. **Verify executable**: `chmod +x .husky/pre-*`
4. **Check git hooks path**: `git config core.hooksPath` (should be `.husky`)

---

## ADHD-Specific Tips

### 🧠 **Medication Timing Considerations**

**High Function Periods (e.g., morning with medication):**

- Tackle complex type errors and refactoring
- Handle multiple file changes
- Debug failing tests

**Lower Function Periods (e.g., afternoon):**

- Focus on single-file changes
- Use auto-fix commands: `bun run format` and `bun run lint`
- Commit smaller, simpler changes

### ⚡ **Quick Win Strategies**

1. **Always start with**: `bun run format` (fixes 80% of pre-commit failures)
2. **Use muscle memory commands**:
   ```bash
   # The "fix everything" sequence
   bun run format
   bun run lint
   bun run check
   ```
3. **Stage specific files**: `git add src/specific-file.ts` instead of `git add .`

### 🎯 **Error Overwhelm Management**

**When seeing lots of errors:**

1. **Focus on the first error only** (hooks fail fast)
2. **Fix one file at a time**
3. **Use VSCode problems panel** for visual error tracking
4. **Take breaks** between complex fixes

---

## Emergency Bypass

**⚠️ Only use when absolutely necessary (e.g., critical hotfix)**

```bash
# Bypass pre-commit (NOT recommended)
git commit --no-verify -m "Emergency fix"

# Bypass pre-push (NOT recommended)
git push --no-verify
```

**After emergency bypass:**

1. Immediately fix the quality issues
2. Create a follow-up commit with fixes
3. Never make bypassing a habit

---

## Getting Help

### 🔍 **Debugging Commands**

```bash
# Check what hooks are installed
ls -la .husky/

# Test pre-commit hook manually
.husky/pre-commit

# Test pre-push hook manually
.husky/pre-push

# Check git hooks configuration
git config --list | grep hooks

# View recent git activity
git log --oneline -5
```

### 📝 **Common File Paths**

- **Hooks**: `.husky/pre-commit`, `.husky/pre-push`
- **Config**: `package.json` (lint-staged section)
- **Prettier**: `.prettierrc.json`
- **Tests**: `tests/unit/scripts.test.ts`, `tests/integration/husky.test.ts`

### 🆘 **When All Else Fails**

1. **Reset hooks completely**:

   ```bash
   rm -rf .husky
   bun install  # Reinstalls hooks
   ```

2. **Check with fresh clone**:

   ```bash
   git clone <repository> fresh-copy
   cd fresh-copy
   bun install
   # Try your changes here
   ```

3. **Ask for help** with this information:
   - Error message (exact text)
   - Command that failed
   - Node/Bun version: `node --version && bun --version`
   - Recent git commits: `git log --oneline -3`

---

## Appendix: Understanding the Tools

### 🔧 **What Each Tool Does**

- **Husky**: Manages git hooks (runs commands during git operations)
- **lint-staged**: Runs tools only on staged files (for speed)
- **Prettier**: Code formatter (spaces, commas, etc.)
- **ESLint**: Code linter (finds problems, enforces patterns)
- **TypeScript**: Type checker (catches type errors)

### 📋 **Hook Execution Order**

**Pre-commit (on `git commit`):**

1. Prettier formats staged files
2. ESLint fixes staged files
3. TypeScript checks entire project
4. Re-stage auto-fixed files
5. Proceed with commit

**Pre-push (on `git push`):**

1. Format check (no auto-fix)
2. Lint check (no auto-fix)
3. TypeScript check
4. Run smoke tests
5. Proceed with push

**Why this order matters:**

- Auto-fixes happen early (pre-commit)
- Validation happens before sharing code (pre-push)
- Fail fast to save time
