# Developer Onboarding Checklist

> ADHD-Optimized Development Environment Setup
> Last Updated: 2025-08-24

## Quick Start (5 minutes)

**Essential steps to get coding immediately:**

1. **✅ Check Node.js version**: `node --version` (need v22.11.0+)
2. **📦 Install dependencies**: `bun install`
3. **🔨 Verify setup**: `bun run check`
4. **🎯 Test hooks**: Make a small change and commit

**If any step fails**, jump to the [Troubleshooting](#troubleshooting) section.

---

## Complete Setup Verification

### Prerequisites ✅

- [ ] **Node.js 22.11.0+** installed (`node --version`)
- [ ] **Bun runtime** installed (`bun --version`)
- [ ] **Git** configured with your name and email
- [ ] **Project cloned** and you're in the project directory

### Environment Setup ⚙️

- [ ] **Dependencies installed**: `bun install` completed successfully
- [ ] **Hooks installed**: `.husky` directory exists with executable files
- [ ] **Tools accessible**: `npx prettier --version`, `npx eslint --version`, `npx tsc --version`

### Quality Tools Verification 🔍

Run each command and verify it completes without errors:

- [ ] **Format check**: `bun run format:check`
- [ ] **Lint check**: `bun run lint:check`
- [ ] **Type check**: `bun run typecheck`
- [ ] **Tests**: `bun run test:smoke`
- [ ] **Complete check**: `bun run check:no-test`

### Git Hooks Testing 🔗

- [ ] **Pre-commit hook**: Make a trivial change, stage it, and commit
- [ ] **Pre-push hook**: Push to a test branch (or simulate with `git push --dry-run`)
- [ ] **Hook bypass**: Know how to use `--no-verify` for emergencies

---

## Development Workflow Understanding

### Daily Commands 📅

**Most frequently used:**

```bash
# Fix most issues automatically
bun run format
bun run lint

# Check everything is good
bun run check

# Run development server
bun run dev
```

**Commit workflow:**

```bash
git add .
git commit -m "Your message"  # Triggers pre-commit hook
git push                      # Triggers pre-push hook
```

### Quality Gates 🚧

**Pre-commit (automatic on `git commit`):**

- ✨ Auto-formats code with Prettier
- 🔧 Auto-fixes ESLint issues
- ⚡ Type-checks entire project
- 🚫 Blocks commit if unfixable errors

**Pre-push (automatic on `git push`):**

- ✅ Validates formatting (no auto-fix)
- ✅ Validates linting (no auto-fix)
- ✅ Validates types
- ✅ Runs smoke tests
- 🚫 Blocks push if any errors

### File Organization 📂

**Configuration files you should know:**

- `.prettierrc.json` - Code formatting rules
- `package.json` - Scripts and lint-staged config
- `.husky/` - Git hooks directory
- `.github/workflows/ci.yml` - CI pipeline

**Documentation:**

- `.husky/README.md` - Git hooks overview
- `.husky/TROUBLESHOOTING.md` - Problem solving guide
- `.husky/ONBOARDING.md` - This file

---

## ADHD-Specific Workflow Tips

### Cognitive Load Management 🧠

**High-function periods (morning with medication):**

- Tackle complex type errors
- Work on multi-file refactoring
- Debug test failures
- Learn new tools/commands

**Lower-function periods (afternoon):**

- Focus on single-file changes
- Use auto-fix commands: `bun run format && bun run lint`
- Make smaller, focused commits
- Rely on pre-commit hooks for quality

### Muscle Memory Commands 💪

**The "fix everything" sequence:**

```bash
bun run format
bun run lint
bun run check
```

**Emergency bypass (use sparingly):**

```bash
git commit --no-verify -m "Emergency fix"
git push --no-verify
```

**Quick health check:**

```bash
bun run check:no-test  # Fast validation without tests
```

### Overwhelm Prevention 🛡️

- **One error at a time**: Fix the first error shown, then re-run
- **Use VSCode problems panel**: Visual error tracking
- **Break after each fix**: Don't try to fix everything at once
- **Stage specific files**: `git add src/specific-file.ts` instead of `git add .`

---

## Troubleshooting

### Common Issues & Quick Fixes 🔧

**"Pre-commit hook failed"**

```bash
bun run format  # Fixes 80% of issues
bun run lint    # Fixes most remaining issues
bun run check   # Verify everything is good
```

**"Command not found"**

```bash
bun install     # Reinstall dependencies
```

**"Hooks not running"**

```bash
bun run prepare  # Reinstall git hooks
chmod +x .husky/pre-*  # Fix permissions
```

**For detailed troubleshooting**: See `.husky/TROUBLESHOOTING.md`

---

## Verification Tests

**Run setup verification tests:**

```bash
bun test tests/integration/setup-verification.test.ts
```

This validates your entire development environment is correctly configured.

---

## Getting Help 🆘

### Self-Service Resources

1. **Troubleshooting guide**: `.husky/TROUBLESHOOTING.md`
2. **Git hooks documentation**: `.husky/README.md`
3. **Setup verification**: `bun test tests/integration/setup-verification.test.ts`

### Debug Information to Collect

If you need help, gather this information:

```bash
# Environment info
node --version
bun --version
git --version

# Project status
git status
bun run check:no-test

# Hook configuration
ls -la .husky/
git config --list | grep hooks
```

### Ask for Help With

- Exact error message
- Command that failed
- Your environment info (above)
- What you were trying to do

---

## Advanced Topics (Optional)

### Understanding the Tools 🔧

- **Husky**: Manages git hooks (runs commands during git operations)
- **lint-staged**: Runs tools only on staged files (performance optimization)
- **Prettier**: Code formatter (spaces, commas, line breaks)
- **ESLint**: Code linter (finds problems, enforces patterns)
- **TypeScript**: Type checker (catches type errors)

### Performance Optimization 🚀

- Use `git add -p` to stage specific chunks
- Commit related changes together
- Stage only what you're working on: `git add src/myfile.ts`
- Use `bun run check:no-test` for faster validation

### CI/CD Understanding 🏗️

- **GitHub Actions**: Runs same checks as local hooks
- **Quality gates**: Format → Lint → Types → Tests → Build
- **Fail fast**: Pipeline stops on first error
- **Branch protection**: Can't merge failing PRs

---

## Congratulations! 🎉

You're ready to contribute to the project. Remember:

1. **Start small**: Make simple changes first
2. **Use auto-fix**: `bun run format` and `bun run lint` are your friends
3. **Commit often**: Small, focused commits are better
4. **Ask questions**: Better to ask than to struggle silently

**Happy coding!** 🚀
