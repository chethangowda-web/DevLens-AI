# AI-Powered Developer Assistant (DevAssist)

> A standalone, repository-aware AI coding assistant and intelligence platform designed to help developers understand, write, debug, search, and review code using natural language.

---

## 📚 Documentation Index

This repository contains the complete specification, architecture, database design, API definitions, security model, and implementation roadmap for **DevAssist**.

| Document | Description |
| :--- | :--- |
| **[🔥 Phase-Based Build Plan](./PHASE_BUILD_PLAN.md)** | **Master 15-Phase Step-by-Step Build Plan** with concepts to learn, task checklists, APIs, DB changes, debugging guides, DoD, and interview questions for every phase. |
| **[1. PRD (Product Requirements Document)](./PRD.md)** | Full product requirements, personas, 38 detailed sections, user stories, and acceptance criteria. |
| **[2. MVP Scope](./MVP_SCOPE.md)** | Pragmatic MVP definition, feature boundaries, included vs. excluded capabilities. |
| **[3. TRD (Technical Requirements Document)](./TRD.md)** | Comprehensive 60-point technical specification, system design, and component breakdown. |
| **[4. System Architecture & Diagrams](./ARCHITECTURE.md)** | End-to-end Mermaid diagrams for system architecture, ingestion, RAG, auth, and data flows. |
| **[5. Database Schema & SQL DDL](./DATABASE_SCHEMA.md)** | Complete PostgreSQL + `pgvector` ERD, schema definitions, relational constraints, and indexes. |
| **[6. API Endpoint Specification](./API_SPECIFICATION.md)** | REST and SSE streaming API endpoints with full request/response schemas. |
| **[7. AI & RAG Pipeline Deep-Dive](./AI_RAG_PIPELINE.md)** | Tree-sitter AST parsing, chunking strategy, hybrid dense+BM25 retrieval, RRF reranking, and prompt architecture. |
| **[8. Security Architecture & Threat Model](./SECURITY_ARCHITECTURE.md)** | STRIDE threat modeling, pre-ingestion secret redaction, zero host execution policy, and RBAC. |
| **[9. Phased Development Roadmap](./DEVELOPMENT_ROADMAP.md)** | Phase 0 to Phase 12 roadmap with Definition of Done (DoD) for each phase. |
| **[10. Technology Decision Matrix](./TECH_DECISION_MATRIX.md)** | In-depth comparison of frameworks, databases, parsers, trade-offs, and final recommended stack. |
| **[11. Implementation & Getting Started Guide](./IMPLEMENTATION_GUIDE.md)** | What to build first, what NOT to build yet, top 10 risks, prerequisites, and step-by-step build order. |

---

## ⚡ Quick Architecture Overview

```
[ Developer Browser (React + Monaco Editor + SSE Stream) ]
                         │
                         ▼
        [ Nginx Ingress / Reverse Proxy (SSL) ]
                         │
                         ▼
[ Backend Modular Monolith (Node.js 20 LTS / Express / TypeScript) ]
    ├── Auth & Session Management (JWT / GitHub OAuth)
    ├── Ingestion & Tree-sitter AST Parser Engine
    ├── Hybrid RAG Engine (pgvector Dense + PostgreSQL BM25 FTS)
    ├── LLM Gateway (OpenAI / Anthropic / Local Ollama)
    └── Async Job Queue (BullMQ + Redis 7)
                         │
                         ▼
           [ PostgreSQL 16 + pgvector ]
```

---

## 🚀 Recommended Next Steps

1. Start by reviewing the **[PRD](./PRD.md)** and **[MVP Scope](./MVP_SCOPE.md)** to align on product boundaries.
2. Read the **[System Architecture](./ARCHITECTURE.md)** and **[Database Schema](./DATABASE_SCHEMA.md)** before initializing code.
3. Follow the **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** to set up the local development environment and database.
