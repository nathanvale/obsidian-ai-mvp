# CLAUDE.md

This file provides guidance to Claude Code when working with the Obsidian AI MVP codebase.

## Agent OS Documentation

### Product Context
- **Mission & Vision:** @.agent-os/product/mission.md
- **Technical Architecture:** @.agent-os/product/tech-stack.md
- **Development Roadmap:** @.agent-os/product/roadmap.md
- **Decision History:** @.agent-os/product/decisions.md

### Development Standards
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management
- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current priorities
2. **Then**, follow the appropriate instruction file:
   - For new features: @.agent-os/instructions/create-spec.md
   - For tasks execution: @.agent-os/instructions/execute-tasks.md
3. **Always**, adhere to the standards in the files listed above

## Project-Specific Instructions

### Technology Stack
- **Runtime:** Bun (not Node.js)
- **Language:** TypeScript
- **API Framework:** Fastify (not Rails)
- **Database:** ChromaDB for vector storage
- **AI Integration:** Ollama with nomic-embed-text model

### Local Development Setup
- Ensure Ollama is installed and running with nomic-embed-text model
- ChromaDB should be running locally (Docker or standalone)
- Set OBSIDIAN_VAULT_PATH environment variable
- Use `bun install` and `bun run dev` for development

### Core Principles
- **Local-First:** All AI processing must remain local (no external APIs)
- **Privacy-Focused:** Never send user data to external services
- **Performance-Optimized:** Leverage Bun's speed for file processing
- **Obsidian-Native:** Design for Obsidian's markdown format and philosophy

### Testing Commands
- Use Wallaby.js for test feedback when available
- Run tests with: `bun test`
- Use `bun run lint` and `bun run typecheck` when configured

## Important Notes

- Product-specific files in `.agent-os/product/` override any global standards
- User's specific instructions override (or amend) instructions found in `.agent-os/specs/...`
- Always adhere to established patterns, code style, and best practices documented above.
- This project uses Bun/TypeScript instead of Rails - adjust Agent OS workflows accordingly