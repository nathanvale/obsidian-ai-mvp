# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-24-bun-typescript-runtime/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Runtime Requirements

### Node.js Version Compatibility

- **Minimum Version:** Node.js 22.11.0+ (Critical for @orchestr8 package compatibility)
- **Version Management:** Support .nvmrc (22.11.0) and .node-version (22.11.0) files
- **Package Engines:** Enforce Node.js >=22.11.0 and Bun >=1.0.0 in package.json
- **Verification:** Automated version checks in development and CI/CD scripts

### Bun Runtime Configuration

- **Primary Runtime:** Bun for development and production execution
- **TypeScript Support:** Native TypeScript compilation without transpilation
- **Module Resolution:** ESM with bundler module resolution for maximum compatibility
- **Hot Reload:** Bun's native --watch and --hot flags for ADHD development workflow

### ADHD Development Environment

- **Local AI Processing:** All AI operations (Ollama, ChromaDB) must remain local
- **Cognitive Load Optimization:** Fast startup times (<3s) and reload times (<1s)
- **Error Recovery:** Resilient development experience with clear error messages
- **Memory Management:** Optimized for M4 MacBook with concurrent AI processing

## Technical Implementation Requirements

- Fix ChromaDB build failures by installing missing optional dependencies (ollama, cohere-ai)
- Create ESLint configuration with TypeScript-specific rules and error detection
- Optimize tsconfig.json for Bun's bundler module resolution and ES2022 target
- Enhance package.json scripts with debugging, hot reload, and production build options
- Implement development environment health checks for external services (Ollama, ChromaDB)
- Maintain compatibility with Node.js 22.11.0 requirement for @orchestr8 packages
- Ensure all changes support the existing local-first AI architecture for ADHD management

## Approach Options

**Option A:** Comprehensive Development Environment Overhaul

- Pros: Modern tooling, excellent developer experience, comprehensive error detection
- Cons: Significant time investment, potential compatibility issues, over-engineering risk

**Option B:** Targeted Fixes with Performance Optimization (Selected)

- Pros: Addresses immediate issues, maintains existing working setup, fast implementation
- Cons: May require future iterations, less comprehensive than full overhaul

**Option C:** Minimal Fixes Only

- Pros: Very fast implementation, minimal risk
- Cons: Doesn't optimize development experience, misses performance improvements

**Rationale:** Option B aligns with the project's "speed over perfection" philosophy while addressing critical build issues and providing meaningful developer experience improvements. This approach fixes immediate problems while setting up for future optimization.

## External Dependencies

- **ollama** - Required ChromaDB optional dependency for local AI integration
- **cohere-ai** - Required ChromaDB optional dependency for embedding compatibility
- **@typescript-eslint/eslint-plugin** - TypeScript-specific ESLint rules and type checking
- **@typescript-eslint/parser** - TypeScript AST parsing for ESLint
- **concurrently** - Run multiple development processes simultaneously (optional enhancement)

**Justification:** These dependencies resolve the current build failures and provide essential development tooling without introducing unnecessary complexity or changing the core architecture.

## Runtime Setup and Installation

### Prerequisites Check

Before setting up the ADHD Digital Second Brain development environment, verify system compatibility:

```bash
# Check current Node.js version
node --version
# Must be 22.11.0 or higher

# Check if Bun is installed
bun --version
# Should be 1.0.0 or higher

# Check system architecture (M4 MacBook recommended)
uname -m
# Should be arm64 for Apple Silicon
```

### Node.js Installation and Version Management

#### Using NVM (Recommended)

```bash
# Install or update to Node.js 22.11.0
nvm install 22.11.0
nvm use 22.11.0
nvm alias default 22.11.0

# Verify installation
node --version  # Should output: v22.11.0
npm --version   # Should be compatible version
```

#### Using Direct Installation

1. Download Node.js 22.11.0+ from [nodejs.org](https://nodejs.org/)
2. Install using the official installer
3. Verify installation: `node --version`

### Bun Runtime Installation

```bash
# Install Bun (latest stable)
curl -fsSL https://bun.sh/install | bash

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Verify installation
bun --version
```

### ADHD Development Environment Setup

#### 1. Project Installation

```bash
# Clone repository
git clone [repository-url]
cd obsidian-ai-mvp

# Install dependencies with Bun (preferred)
bun install

# Alternative: use npm if Bun installation fails
npm install
```

#### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Required environment variables for ADHD development:
OBSIDIAN_VAULT_PATH=/path/to/your/obsidian/vault
OLLAMA_BASE_URL=http://localhost:11434
CHROMADB_URL=http://localhost:8000
LOG_LEVEL=info
NODE_ENV=development
```

#### 3. External Services Setup

```bash
# Install and start Ollama
brew install ollama
ollama serve &

# Pull required embedding model
ollama pull nomic-embed-text

# Install and start ChromaDB
docker run -p 8000:8000 chromadb/chroma

# Verify services are running
bun run health
```

#### 4. Development Verification

```bash
# Run version compatibility check
bun run check-node
bun run check-bun

# Run type checking
bun run typecheck

# Run smoke tests
bun run test:smoke

# Start development server
bun run dev
```

## Troubleshooting Guide

### Common Node.js Version Issues

**Problem:** `@orchestr8` packages fail to install
```bash
Error: Unsupported Node.js version
```

**Solution:**
```bash
# Check current Node.js version
node --version

# If version is < 22.11.0, upgrade:
nvm install 22.11.0
nvm use 22.11.0

# Clear cache and reinstall
bun run clean
bun install
```

### Bun Runtime Issues

**Problem:** Bun not found or version conflicts
```bash
Command 'bun' not found
```

**Solution:**
```bash
# Reinstall Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (if not automatic)
export PATH="$HOME/.bun/bin:$PATH"

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

### @orchestr8 Package Compatibility

**Problem:** Package installation failures
```bash
npm ERR! peer dep missing: node@>=22.11.0
```

**Solution:**
```bash
# Verify Node.js version meets requirements
node --version  # Must be >=22.11.0

# Force clean installation
rm -rf node_modules bun.lockb package-lock.json
bun install

# Alternative with npm if issues persist
npm install --force
```

### Development Environment Performance

**Problem:** Slow startup or reload times (>3s startup, >1s reload)

**Solution:**
```bash
# Check system resources
top -pid $(pgrep ollama)  # Ollama memory usage
top -pid $(pgrep chroma)  # ChromaDB memory usage

# Optimize for ADHD workflow:
# Use Bun's native watch mode
bun run dev  # Uses --watch --hot

# Enable debug mode for detailed timing
bun run dev:debug
```

### Local AI Services Connectivity

**Problem:** Ollama or ChromaDB connection failures

**Solution:**
```bash
# Check service status
bun run health:ollama
bun run health:chromadb

# Restart services
pkill ollama; ollama serve &
docker restart chromadb

# Verify model availability
ollama list | grep nomic-embed-text
```

## Performance Optimization for ADHD Development

### Memory Management (M4 MacBook)

- **Ollama:** Allocate 6-8GB for LLM processing
- **ChromaDB:** Reserve 4-6GB for vector operations
- **Development:** Monitor memory usage during ADHD workflow iterations

### Startup Time Optimization

- **Target:** <3 seconds for development server startup
- **Techniques:** Lazy loading, service health checks, cached builds
- **Monitoring:** Use `bun run dev:verbose` for timing analysis

### Cognitive Load Considerations

- **Hot Reload:** <1 second for code changes to reflect in browser
- **Error Messages:** Clear, actionable feedback for ADHD developers
- **Progress Indicators:** Visual feedback for AI processing operations

## Security and Privacy for ADHD Data

### Local Processing Verification

```bash
# Verify no external API calls
netstat -an | grep ESTABLISHED  # Should only show localhost connections
lsof -i :11434  # Ollama local only
lsof -i :8000   # ChromaDB local only
```

### Data Protection

- All ADHD-related data (voice memos, emails, thoughts) processed locally
- No cloud dependencies for core AI functionality
- Encrypted storage for sensitive ChromaDB collections
