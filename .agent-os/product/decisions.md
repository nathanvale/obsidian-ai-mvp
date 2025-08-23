# Product Decisions Log

> Last Updated: 2025-08-23
> Version: 1.0.0
> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-08-23: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead, Team

### Decision

Create a local-first AI-powered Obsidian knowledge assistant that provides semantic search, quiz generation, and conversational AI capabilities while maintaining complete privacy through local LLM processing.

### Context

The market for AI-powered knowledge tools is dominated by cloud-based solutions that require uploading personal notes to external services. This creates significant privacy concerns, especially for researchers, consultants, and knowledge workers handling sensitive information. Meanwhile, Obsidian users have expressed strong demand for AI capabilities that respect their local-first philosophy and privacy requirements.

### Alternatives Considered

1. **Cloud-based AI Integration (OpenAI/Anthropic APIs)**
   - Pros: Superior AI capabilities, easier implementation, faster time-to-market
   - Cons: Privacy concerns, ongoing API costs, internet dependency, data sovereignty issues

2. **Hybrid Approach (Local + Cloud)**
   - Pros: Flexibility, option for enhanced features
   - Cons: Complexity, still requires external data sharing, inconsistent privacy model

3. **Pure Local Processing with Ollama**
   - Pros: Complete privacy, no ongoing costs, offline capability, aligns with Obsidian philosophy
   - Cons: Higher setup complexity, limited by local hardware, potentially slower processing

### Rationale

Selected pure local processing because:
- Aligns perfectly with Obsidian's local-first philosophy and user expectations
- Addresses the primary market gap (privacy-focused AI knowledge tools)
- Eliminates ongoing operational costs for users
- Creates a sustainable competitive advantage
- Enables offline functionality
- Positions the product for potential Obsidian plugin ecosystem integration

### Consequences

**Positive:**
- Complete user data privacy and security
- No ongoing subscription or API costs
- Offline functionality
- Appeals to privacy-conscious knowledge workers
- Differentiates from all major competitors
- Sustainable long-term architecture

**Negative:**
- Higher initial setup complexity for users
- Performance limited by local hardware capabilities
- Requires users to install and manage Ollama
- Potentially slower AI responses compared to cloud solutions
- Limited to models that can run locally

## 2025-08-23: Technology Stack Selection

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Development Team

### Decision

Use Bun + TypeScript + Fastify + ChromaDB + Ollama as the core technology stack, deviating from the standard Rails-based Agent OS defaults.

### Context

The project requires high-performance file processing, vector operations, and real-time embedding generation. The standard Rails stack, while excellent for web applications, introduces unnecessary overhead for this AI-focused backend service. Bun's performance characteristics and native TypeScript support align better with the computational requirements.

### Alternatives Considered

1. **Ruby on Rails + PostgreSQL (Agent OS Standard)**
   - Pros: Familiar stack, mature ecosystem, established patterns
   - Cons: Slower for file processing, less optimal for AI/ML workloads, additional complexity for vector operations

2. **Node.js + Express + PostgreSQL with pgvector**
   - Pros: JavaScript ecosystem, familiar to many developers, SQL-based vector operations
   - Cons: Slower than Bun, pgvector less mature than ChromaDB for vector operations

### Rationale

Selected Bun-based stack because:
- 3x+ faster performance for file I/O operations compared to Node.js
- Native TypeScript support eliminates build complexity
- ChromaDB provides superior vector search capabilities and performance
- Fastify offers excellent performance while maintaining simplicity
- Stack optimization specifically for AI/ML workloads
- Smaller memory footprint important for local deployment

### Consequences

**Positive:**
- Significantly better performance for file processing and embedding generation
- Simplified development experience with native TypeScript
- Optimized vector search capabilities
- Lower resource usage on user machines
- Modern, performant technology stack

**Negative:**
- Deviation from Agent OS standards requiring custom documentation
- Smaller community compared to Rails ecosystem
- Less mature tooling and debugging resources
- Team may need to learn new technologies

## 2025-08-23: Local-First Architecture Commitment

**ID:** DEC-003
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Product Owner, Tech Lead, Security

### Decision

Commit to a purely local-first architecture with no external AI API dependencies, even as optional features.

### Context

While local-first processing is core to the product vision, there was consideration of offering "enhanced" features through optional cloud AI integrations for users willing to trade privacy for capabilities.

### Alternatives Considered

1. **Pure Local with Optional Cloud Enhancement**
   - Pros: Best of both worlds, user choice, potential revenue opportunities
   - Cons: Architectural complexity, inconsistent privacy model, feature fragmentation

2. **Local-First with Fallback to Cloud**
   - Pros: Reliability, graceful degradation
   - Cons: Privacy model confusion, dependency creep, user trust issues

### Rationale

Committed to pure local processing because:
- Maintains clear, consistent value proposition
- Builds stronger user trust and market differentiation
- Simplifies architecture and reduces complexity
- Avoids feature creep that could compromise core vision
- Creates stronger competitive moat

### Consequences

**Positive:**
- Clear, trustworthy privacy model
- Simplified architecture and development
- Strong competitive differentiation
- No ongoing operational dependencies
- Consistent user experience

**Negative:**
- Limited by local hardware capabilities
- Cannot leverage latest cloud AI advances
- May miss opportunities for enhanced features
- Potentially slower adoption for users seeking maximum AI capabilities