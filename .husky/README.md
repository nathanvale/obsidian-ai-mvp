# Git Hooks Configuration

This directory contains Git hooks configured with Husky for the ADHD Digital Second Brain project, following the proven @orchestr8 pattern.

## Hooks Overview

### Pre-commit Hook

- **Purpose**: Automatically format and fix code issues before commits
- **Scope**: Only processes staged files (fast execution)
- **Actions**:
  1. Runs Prettier to format code
  2. Runs ESLint with `--fix` to auto-fix issues
  3. Runs TypeScript type checking
  4. Re-stages fixed files automatically
  5. Fails if there are unfixable ESLint errors

### Pre-push Hook

- **Purpose**: Comprehensive validation before pushing to remote
- **Scope**: Runs full validation suite on all project files
- **Actions**:
  1. Runs full `bun run check` command
  2. Includes format check, lint, type-check, and smoke tests
  3. Uses Bun's speed for performance
  4. Can be bypassed with `--no-verify` if needed

## Developer Workflow

### Normal Workflow

```bash
# Make changes
git add .
git commit -m "feat: add new feature"  # Pre-commit runs automatically
git push                               # Pre-push runs comprehensive checks
```

### Bypass Hooks (Emergency Only)

```bash
git commit --no-verify -m "emergency fix"
git push --no-verify
```

## Troubleshooting

### Pre-commit Hook Issues

#### Issue: "prettier command not found"

**Solution**: Ensure dependencies are installed

```bash
bun install
```

#### Issue: ESLint errors that can't be auto-fixed

**Solution**: Fix the errors manually, then commit again

```bash
# See specific errors
bun run lint:check

# Fix errors automatically where possible
bun run lint

# Manual fixes may be required for some issues
```

#### Issue: TypeScript errors during pre-commit

**Solution**: Fix TypeScript errors before committing

```bash
# Check TypeScript errors
bun run typecheck

# Fix errors in your code
# Then commit again
```

#### Issue: Hook runs on too many files (slow)

**Cause**: You may have staged more files than intended
**Solution**: Check staged files and unstage unnecessary ones

```bash
git status
git reset HEAD <file>  # Unstage specific file
```

### Pre-push Hook Issues

#### Issue: Pre-push takes too long

**Solution**: Pre-push runs comprehensive checks for safety. Use Bun's speed advantage.

```bash
# Check what's included in the check command
bun run check:no-test  # Faster validation without tests
bun run test:smoke     # Only critical tests
```

#### Issue: Tests fail in pre-push

**Solution**: Fix the tests before pushing

```bash
# Run tests manually
bun test

# Run only smoke tests
bun run test:smoke

# Use Wallaby.js for faster feedback during development
```

#### Issue: Format check fails in pre-push

**Solution**: Run formatter and commit the changes

```bash
# Format all files
bun run format

# Check what needs formatting
bun run format:check

# Commit formatted files
git add .
git commit -m "style: format code"
```

### General Issues

#### Issue: Hooks not running at all

**Solution**: Reinstall Husky hooks

```bash
# Husky should auto-install via prepare script
bun install

# Or manually install
bunx husky install
```

#### Issue: Permission denied on hook files

**Solution**: Make hooks executable

```bash
chmod +x .husky/pre-commit .husky/pre-push
```

#### Issue: Hooks running on CI/CD

**Cause**: CI environments should not run Git hooks
**Solution**: Hooks automatically detect CI environment and exit early

## Configuration Files

- `.husky/pre-commit` - Pre-commit hook script
- `.husky/pre-push` - Pre-push hook script
- `package.json` - lint-staged configuration and scripts
- `.prettierrc.json` - Prettier formatting rules
- `.eslintrc.json` - ESLint rules and configuration

## Performance Optimization

The hooks are optimized for performance:

1. **Pre-commit**: Only processes staged files via lint-staged
2. **ESLint caching**: Uses `--cache` flag for faster subsequent runs
3. **Bun runtime**: Leverages Bun's speed for all operations
4. **Parallel execution**: lint-staged runs commands in parallel where safe
5. **Targeted execution**: Each hook runs only necessary checks

## Emergency Procedures

### Completely Disable Hooks

```bash
# Temporary disable
export HUSKY=0

# Permanent disable (not recommended)
rm -rf .husky
```

### Reset Hook Configuration

```bash
# Reinstall from scratch
rm -rf .husky
bun install  # prepare script will reinstall
```

### Skip Pre-push for Urgent Fixes

```bash
# Only for emergencies - CI will still validate
git push --no-verify
```

## Best Practices

1. **Don't bypass hooks unnecessarily** - They catch issues before CI
2. **Use Wallaby.js during development** - Faster than waiting for pre-push tests
3. **Stage only related files** - Faster pre-commit execution
4. **Run `bun run check` before pushing** - Avoid pre-push failures
5. **Keep commits small** - Faster hook execution
6. **Use smoke tests** - Critical validation without full test suite overhead

## ADHD-Friendly Tips

1. **Clear error messages** - Hooks provide actionable feedback
2. **Fast feedback loops** - Pre-commit is optimized for speed
3. **Minimal cognitive load** - Hooks handle formatting/fixing automatically
4. **Emergency bypass** - `--no-verify` available for urgent situations
5. **Visual progress** - Clear output shows what's happening

## Support

If you encounter issues not covered here:

1. Check if the issue exists in CI as well
2. Try running the commands manually (e.g., `bun run check`)
3. Ensure all dependencies are up to date with `bun install`
4. Consider if the issue is with your changes or the hook configuration
5. Use `--no-verify` only for genuine emergencies
