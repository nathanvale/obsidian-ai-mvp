# Product Mission

> Last Updated: 2025-08-23
> Version: 1.0.0

## Pitch

Obsidian AI MVP is a local-first AI-powered knowledge assistant that helps Obsidian users unlock deeper insights from their personal knowledge base by providing semantic search, intelligent quiz generation, and conversational AI - all while keeping data completely private and secure on their local machine.

## Users

### Primary Customers

- **Knowledge Workers**: Researchers, writers, students, and professionals who maintain extensive Obsidian vaults
- **Privacy-Conscious Users**: Individuals who want AI capabilities without sending their personal notes to external services

### User Personas

**Academic Researcher** (25-45 years old)
- **Role:** PhD Student, Professor, Research Scientist
- **Context:** Maintains extensive research notes, literature reviews, and theoretical frameworks in Obsidian
- **Pain Points:** Difficulty finding relevant connections across hundreds of notes, time-consuming manual review for exam preparation
- **Goals:** Quickly locate relevant research, generate study materials, discover hidden connections in their knowledge base

**Professional Knowledge Worker** (28-50 years old)
- **Role:** Consultant, Product Manager, Technical Writer
- **Context:** Uses Obsidian for project documentation, meeting notes, and strategic planning
- **Pain Points:** Information silos, difficulty accessing relevant past work, manual knowledge synthesis
- **Goals:** Rapid information retrieval, automated knowledge synthesis, enhanced decision-making support

## The Problem

### Information Overload in Personal Knowledge Systems

Personal knowledge bases grow exponentially but traditional search methods rely on exact keyword matching, making it difficult to find relevant information when you don't remember the exact terms used. Users spend significant time manually browsing through notes instead of leveraging their accumulated knowledge effectively.

**Our Solution:** Semantic search powered by local LLMs that understands meaning and context, not just keywords.

### Privacy Concerns with AI-Powered Knowledge Tools

Most AI knowledge tools require uploading personal notes to external services, creating privacy and security risks that knowledge workers cannot accept, especially in sensitive domains like research, consulting, or personal journaling.

**Our Solution:** Complete local processing using Ollama and ChromaDB, ensuring all data stays on the user's machine.

### Passive Knowledge Consumption

Knowledge bases become write-only systems where users add information but struggle to actively engage with and test their understanding of accumulated knowledge.

**Our Solution:** AI-powered quiz generation and conversational interfaces that transform passive note storage into active learning systems.

## Differentiators

### Complete Local Processing

Unlike tools like Notion AI or Roam Research AI features, we provide enterprise-grade AI capabilities that never send data to external servers. This results in absolute privacy, no subscription costs for AI API usage, and no internet dependency for core functionality.

### Obsidian-Native Integration

Unlike generic AI knowledge tools, we're built specifically for Obsidian's markdown format and linking structure. This results in seamless integration with existing workflows and preservation of Obsidian's core philosophy of local, future-proof note storage.

### Real-time Learning Capability

Unlike static search systems, our AI continuously learns from user interactions and note updates, providing increasingly relevant results and suggestions over time while maintaining complete local processing.

## Key Features

### Core Features

- **Semantic Search:** Find notes by meaning and context, not just exact keyword matches
- **Real-time Indexing:** Automatically updates as notes are modified or added to the vault
- **Local LLM Integration:** Uses Ollama for all AI operations, ensuring complete privacy
- **Intelligent Chunking:** Breaks down large notes into meaningful segments for better search relevance

### Learning Features

- **Quiz Generation:** Creates personalized quizzes from note content to test knowledge retention
- **Conversational AI:** Chat interface to ask questions about your knowledge base
- **Knowledge Gap Identification:** Highlights areas where additional research might be beneficial
- **Concept Relationship Mapping:** Discovers and visualizes connections between different topics

### Technical Features

- **High Performance:** Built with Bun and TypeScript for maximum speed
- **ChromaDB Integration:** Efficient vector storage and similarity search capabilities
- **Batch Processing:** Optimized embedding generation for large vault processing
- **RESTful API:** Clean interface for potential future integrations and extensions