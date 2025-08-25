# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-24-deployment-preparation/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Technical Requirements

### Pre-commit Hook Infrastructure

- Husky installation and configuration for Git hook management
- Cross-platform compatibility (macOS development environment)
- Automatic hook installation during `bun install` or `pnpm install`
- Hook execution performance optimization to maintain development velocity
- Clear error messaging when hooks fail with actionable remediation steps

### Code Quality Tools Integration

- Prettier configuration aligned with existing project formatting preferences
- ESLint integration with TypeScript parser and @orchestr8 package compatibility
- TypeScript strict mode validation without build artifacts
- Bun test execution with proper exit codes and error reporting
- Integration with existing `package.json` scripts for consistency

### GitHub Actions Workflow

- Matrix strategy supporting Node.js 22.11.0+ requirement
- Bun runtime installation and caching for CI performance
- Service dependency management (Ollama and ChromaDB are NOT required for CI)
- Artifact generation for failed builds with diagnostic information
- Branch protection integration for main branch quality gates

## Approach Options

**Option A:** Minimal Husky Setup with Basic Hooks

- Pros: Quick implementation, minimal overhead, follows project's speed-focused approach
- Cons: Limited flexibility for future enhancement, basic error reporting

**Option B:** @orchestr8 Pattern with Husky + lint-staged (Selected)

- Pros: Proven in production, optimized performance (only checks staged files), excellent developer experience, professional-grade setup
- Cons: Additional dependency, slightly more complex configuration than basic hooks

**Option C:** Custom Git Hook Scripts

- Pros: No external dependencies, complete control
- Cons: Cross-platform compatibility issues, manual maintenance burden, no proven track record

**Rationale:** Option B adopts the exact pattern used successfully in the @orchestr8 monorepo, providing battle-tested reliability while maintaining development velocity through optimized staged-file processing.

## External Dependencies

- **husky** - Git hook management with automatic installation and cross-platform support
  - **Justification:** Industry standard for Git hook automation, excellent developer experience, minimal configuration overhead

- **lint-staged** - Run linters on staged files for optimal performance
  - **Justification:** Dramatically improves pre-commit hook speed by processing only changed files, essential for maintaining development velocity

## Implementation Architecture

### Pre-commit Hook Flow

```
Git commit attempt
↓
Husky triggers pre-commit hook
↓
Lint-staged processes only staged files:
  - src/**/*.ts files → Prettier format (--write, auto-fixes)
  - src/**/*.ts files → ESLint validation with auto-fix (--fix)
  - src/**/*.ts files → TypeScript type check (project-wide)
  - *.{json,md,yml,yaml} files → Prettier format (--write)
↓
Auto-fixes applied → Files re-staged automatically
All checks pass → Commit proceeds
Type check fails → Commit blocked with error details
```

### CI Workflow Architecture

```
GitHub push/PR trigger
↓
Setup job environment:
  - Checkout code
  - Install Bun runtime
  - Cache dependencies
↓
Quality gates (parallel execution):
  - Format validation (Prettier)
  - Linting validation (ESLint)
  - Type checking (TypeScript)
  - Test execution (Bun)
  - Build validation (Bun build)
↓
All gates pass → Workflow success
Any gate fails → Workflow fails with diagnostics
```

### Configuration Integration Points

#### Husky Integration (@orchestr8 Two-Hook Pattern)

- `.husky/pre-commit` script execution with lint-staged
- `.husky/pre-push` script execution with full validation
- `package.json` prepare script for automatic installation
- `.husky/_/husky.sh` compatibility layer
- `.husky/README.md` comprehensive documentation

#### Lint-staged Configuration (@orchestr8 Pattern)

```json
{
  "lint-staged": {
    "src/**/*.ts": [
      "prettier --write",
      "eslint --fix --cache",
      "bash -c 'bun run typecheck'"
    ],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

#### Package.json Scripts (@orchestr8 Standards)

```json
{
  "scripts": {
    "prepare": "husky",
    "check:no-test": "bun run format:check && bun run lint:check && bun run typecheck",
    "check": "bun run check:no-test && bun run test:smoke",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint . --fix --cache",
    "lint:check": "eslint . --cache --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test:smoke": "bun test --testNamePattern='smoke'"
  }
}
```

**Script Explanation**:

- `prepare`: Auto-installs Husky hooks on `bun install`
- `check:no-test`: Fast validation (used by CI and for quick checks)
- `check`: Full validation including smoke tests (used by pre-push hook)
- `format`/`format:check`: Prettier formatting (write vs. validate)
- `lint`/`lint:check`: ESLint with fix vs. validate modes
- `typecheck`: TypeScript validation without build
- `test:smoke`: Critical tests only (5 max per DEC-003 decision)

#### GitHub Actions Workflow (@orchestr8 Validate Job)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  workflow_dispatch:
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run check:no-test
      - run: bun run build
      - run: bun run test:smoke
```

#### Pre-push Hook Configuration (@orchestr8 Pattern)

```bash
#!/usr/bin/env sh
bun run check
```

**Purpose**: Comprehensive validation before pushing to remote repository
**Scope**: Runs full quality checks (format:check, lint:check, type-check, test:smoke)
**Performance**: Uses Bun's speed for faster execution than traditional Node.js
**Safety**: Final quality gate to prevent broken code from reaching remote

#### Husky Hook Flow (@orchestr8 Two-Hook Strategy)

**Key Distinction**:

- **Pre-commit**: Auto-fixes issues where possible, only blocks on unfixable errors (TypeScript)
- **Pre-push**: Validates quality without making changes, blocks on any quality issues

```
Pre-commit (Fast - Auto-fix - Staged Files Only):
  Developer commits → Husky triggers → lint-staged →
  Auto-format TypeScript files → Auto-fix ESLint issues →
  Re-stage fixed files → TypeScript type check → Commit proceeds

Pre-push (Comprehensive - Full Validation Including Tests):
  Developer pushes → Husky triggers → bun run check →
  Format validation → Lint validation → Type check →
  Smoke tests execution → Push proceeds
```

#### GitHub Actions Integration

- Environment variable configuration for CI context
- Matrix strategy for Node.js version compatibility
- Caching strategy for `node_modules` and Bun cache
