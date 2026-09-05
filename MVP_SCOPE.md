# Minimum Viable Product (MVP) Scope Definition
## Project: DevAssist

---

## 1. MVP Objective
To deliver the smallest, most reliable standalone product that demonstrates clear developer value:
> *"An AI assistant that understands a developer's codebase and can answer questions, explain code, debug errors, search the repository, and generate useful code."*

---

## 2. In-Scope Features (Must Have - P0)

### 1. Authentication & User Management
- Email & password registration/login (Argon2id hashing).
- GitHub OAuth2 single sign-on.
- JWT-based authentication stored in `HttpOnly`, `Secure` cookies.

### 2. Project & Repository Ingestion
- Upload `.zip` archive or paste a public Git repository clone URL.
- File filters: Automated exclusion of `.git/`, `node_modules/`, lock files, binaries, `.env*`.
- Security filter: Automated regex and entropy-based secret scrubber.
- Repository size limits: Max 50MB archive, max 1,500 code files.

### 3. Structural Code Parsing & Chunking
- Tree-sitter AST parsing for:
  - TypeScript (`.ts`, `.tsx`)
  - JavaScript (`.js`, `.jsx`)
  - Python (`.py`)
  - Go (`.go`)
- Extraction of function, class, and interface boundaries.
- Prepending breadcrumb context (File path, Class name, Function signature) to each chunk.

### 4. Hybrid Search & Vector Database
- PostgreSQL 16 with `pgvector` extension.
- Embeddings: OpenAI `text-embedding-3-small` (1536 dimensions).
- Dense vector similarity (HNSW index) + PostgreSQL Full-Text Search (`tsvector`).
- Reciprocal Rank Fusion (RRF) reranking.

### 5. Streaming AI Assistant (Web UI)
- Server-Sent Events (SSE) streaming chat.
- Markdown renderer with syntax highlighting and copy buttons.
- Citation chips that reference exact file paths and line ranges.
- Integrated Monaco Editor to view indexed files side-by-side with the chat.

### 6. Code Explainer & Error Diagnostic (Debugger)
- Line-by-line explanation mode with difficulty selection (Beginner, Intermediate, Architect).
- Error diagnostic mode: Input stack trace + code snippet -> outputs explanation + unified diff.

---

## 3. Explicitly Excluded Features (Post-MVP)

| Excluded Feature | Reason for Exclusion from MVP | Planned Phase |
| :--- | :--- | :--- |
| **Private GitHub App Repositories** | Requires complex webhook handshake and webhook secret management. | Phase 2 |
| **Automated PR Writing / Branch Push** | High operational and security risk; requires write permissions. | Phase 3 |
| **IDE Plugins (VS Code / JetBrains)** | Adds multi-client maintenance overhead before API stabilizes. | Phase 3 |
| **Live Dynamic Code Sandbox** | Complex container orchestration and container breakout risks. | Phase 3 |
| **Microservices Architecture** | Unnecessary operational overhead for early-stage traffic. | Future |
| **Autonomous Multi-file Refactor Agent** | High failure and hallucination rate without complex eval harnesses. | Phase 3 |

---

## 4. MVP Architecture & Technology Stack

```
[ Frontend: React 18 + Vite + Tailwind + Monaco Editor ]
                           │
                 (HTTP REST + SSE Stream)
                           │
                           ▼
 [ Backend: Node.js 20 LTS + Express Modular Monolith + TypeScript ]
    ├── Ingestion Engine (Tree-sitter AST Parser)
    ├── Hybrid RAG Engine (pgvector + FTS)
    ├── LLM Controller (OpenAI API / gpt-4o & gpt-4o-mini)
    └── Background Job Worker (BullMQ)
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
   [ PostgreSQL 16 + pgvector ]     [ Redis 7 Cache & Queue ]
```

---

## 5. MVP UI Pages & Layouts

1. **`/login` & `/register`**: Clean authentication screen with email/password and GitHub OAuth button.
2. **`/dashboard`**: Overview of user projects, active repositories, and indexing status badges.
3. **`/projects/new`**: Simple repository connector (File Drag & Drop for ZIP or Git Clone URL input).
4. **`/workspace/:projectId`**: The primary developer IDE-like workspace:
   - **Left Sidebar:** Collapsible File Explorer tree.
   - **Center Panel:** Monaco Code Editor with active syntax highlighting and split-diff viewer.
   - **Right Drawer:** AI Chat Assistant with mode selector (`Chat`, `Explain`, `Debug`, `Search`), token counter, and streaming output with citation badges.

---

## 6. MVP Development Milestones

| Milestone | Deliverables | Target Timeline |
| :--- | :--- | :--- |
| **M1: Core Infra** | Monorepo setup, PostgreSQL + pgvector Docker, Redis, Auth API. | Week 1 |
| **M2: Parsing & RAG** | Tree-sitter AST parser, BullMQ indexing worker, pgvector hybrid search. | Week 2-3 |
| **M3: AI & Streaming** | LLM gateway, prompt assembler, SSE streaming endpoint. | Week 4 |
| **M4: Workspace UI** | React frontend, Monaco editor, file tree, streaming chat drawer. | Week 5 |
| **M5: MVP Launch** | Security hardening, rate limiting, Docker compose packaging, user testing. | Week 6 |
