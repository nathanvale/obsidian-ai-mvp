# CLAUDE.md

This file provides guidance to Claude Code when working with the Obsidian AI MVP codebase.

## Agent OS Documentation - ADHD Digital Second Brain

### Product Context

- **Mission & Vision:** @.agent-os/product/mission.md - ADHD cognitive support focus with local-first processing
- **Technical Architecture:** @.agent-os/product/tech-stack.md - Bun, Fastify, ChromaDB, Ollama stack
- **Development Roadmap:** @.agent-os/product/roadmap.md - 4-week rapid development plan
- **Decision History:** @.agent-os/product/decisions.md - Speed-over-perfection approach documented

### Development Standards

- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management

- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## ADHD-Focused Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current phase priorities
2. **Remember**: This is a hobby project focused on ADHD management - speed over perfection
3. **Use structured logging** (@orchestr8/logger) instead of extensive unit tests
4. **Leverage existing code** - 83% reuse rate, avoid rewriting what works
5. **Follow local-first principle** - all AI processing stays on device

### Current Priority: Phase 1 - Voice Processing

- Voice memo transcription (Apple Watch → Whisper → Obsidian)
- Document indexing with ChromaDB
- Semantic search implementation

## Project-Specific Instructions

### Technology Stack

- **Node.js:** Requires Node.js 22.11.0+ for @orchestr8 package compatibility
- **Runtime:** Bun (primary runtime)
- **Language:** TypeScript
- **API Framework:** Fastify (not Rails)
- **Database:** ChromaDB for vector storage
- **AI Integration:** Ollama with nomic-embed-text model

### Local Development Setup

- Install Node.js 22.11.0 or higher (required for @orchestr8 packages)
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
