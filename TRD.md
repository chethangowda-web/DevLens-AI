# Technical Requirements Document (TRD)
## Project: AI-Powered Developer Assistant (DevAssist)

---

## 1. Technical Overview
DevAssist is a high-performance, containerized web platform built on a Modular Monolith architecture. It connects to software repositories, parses code using language-specific Abstract Syntax Trees (AST), generates semantic embeddings, and stores them in PostgreSQL using `pgvector`. Queries are resolved using hybrid Reciprocal Rank Fusion (RRF) search and fed into an LLM via structured prompt templates to produce streaming responses via Server-Sent Events (SSE).

---

## 2. System Objectives
- **Sub-500ms TTFT (Time-to-First-Token):** High-responsiveness streaming chat completions.
- **Sub-60s Ingestion:** Parse, chunk, embed, and index a 50MB repository (< 1,500 files).
- **Sub-150ms Hybrid Search:** Return top-8 semantically and lexically relevant code chunks.
- **Zero Host Execution:** Complete isolation from executing untrusted user code.

---

## 3–5. Architecture Overview & High-Level System Design

```
+---------------------------------------------------------------------------------+
|                               DEVELOPER BROWSER                                 |
|   +--------------------------+  +-------------------+  +--------------------+   |
|   | Monaco Code Editor / Diff|  | Tree File Explorer|  | Streaming AI Chat  |   |
|   +--------------------------+  +-------------------+  +--------------------+   |
+----------------------------------------+----------------------------------------+
                                         | HTTPS / SSE Streaming
                                         v
+---------------------------------------------------------------------------------+
|                     NGINX REVERSE PROXY & SSL TERMINATION                       |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                       NODE.JS / EXPRESS MODULAR MONOLITH                        |
|                                                                                 |
|   +-------------------+  +--------------------+  +--------------------------+   |
|   | Auth & RBAC Guard |  | Ingestion Service  |  | Hybrid RAG & Retrieval   |   |
|   +-------------------+  +--------------------+  +--------------------------+   |
|   +-------------------+  +--------------------+  +--------------------------+   |
|   | Tree-sitter Parser|  | BullMQ Job Producer|  | LLM Provider Gateway     |   |
|   +-------------------+  +--------------------+  +--------------------------+   |
+-------------------+--------------------+--------------------+-------------------+
                    |                    |                    |
                    v                    v                    v
+-----------------------+  +--------------------+  +------------------------------+
|     POSTGRESQL 16     |  |      REDIS 7       |  |     EXTERNAL AI SERVICES     |
|   - Relational Tables |  |   - BullMQ Queue   |  |   - OpenAI / Anthropic APIs  |
|   - pgvector (HNSW)   |  |   - Session Cache  |  |   - Embeddings API           |
|   - Full-Text Search  |  |   - Rate Limiter   |  |                              |
+-----------------------+  +--------------------+  +------------------------------+
```

---

## 6. Frontend Architecture
- **Framework:** React 18 with TypeScript and Vite.
- **UI & Styling:** Tailwind CSS + Radix UI primitives (`shadcn/ui`).
- **Code Editor:** `@monaco-editor/react` for syntax highlighting, line navigation, and split-diffs.
- **State Management:** `Zustand` for active repo state, chat message history, and file selection.
- **Server State & Data Fetching:** `TanStack Query (v5)` for REST mutations with native `EventSource` / `fetch` readable streams for SSE.
- **Markdown Renderer:** `react-markdown` with `rehype-highlight` and custom interactive code action toolbars.

---

## 7. Backend Architecture
- **Runtime:** Node.js (v20 LTS) in TypeScript strict mode.
- **Framework:** Express.js organized as a Modular Monolith:
  - `src/modules/auth`: User registration, session cookies, OAuth callbacks.
  - `src/modules/projects`: Project and repository metadata management.
  - `src/modules/ingestion`: Repository cloning, ZIP unpacking, file sanitization.
  - `src/modules/parser`: Tree-sitter AST traversal and structural chunking.
  - `src/modules/rag`: Embedding generation, vector similarity, BM25 FTS query execution.
  - `src/modules/chat`: Conversation management, prompt assembly, LLM streaming controller.
- **Job Processing:** `BullMQ` running on Redis for async repo indexing.

---

## 8–20. AI / LLM & RAG Architecture Specifications

### 8. LLM Architecture
- **Providers Supported:** OpenAI (`gpt-4o`, `gpt-4o-mini`), Anthropic (`claude-3-5-sonnet`), and local Ollama (`deepseek-coder`, `llama3`).
- **Orchestration:** Custom lightweight provider abstraction (no bloated frameworks) using direct SDKs.

### 9. RAG Architecture
- **Vector Dimensions:** 1536 (OpenAI `text-embedding-3-small`).
- **Distance Metric:** Cosine Similarity (`vector_cosine_ops`).
- **Index Type:** HNSW (`m=16, ef_construction=64`).

### 10. Repository Ingestion Pipeline
1. Clone Git repo to ephemeral disk or extract uploaded ZIP.
2. Read `.gitignore` and enforce hardcoded exclusion rules.
3. Run regex secret scrubber to redact sensitive tokens.
4. Pass valid code files to the AST Parser.

### 11–12. Code Parsing & Chunking Strategy
- **Grammars:** Tree-sitter bindings for TypeScript, JavaScript, Python, and Go.
- **Boundary Strategy:** Slices along class, method, function, and interface declarations.
- **Breadcrumbs:** Prepends file path and parent class signatures to maintain structural context.
- **Size:** 300 to 800 tokens per chunk with 10% overlap on structural boundaries.

### 13–15. Embedding & Retrieval Strategy
- **Dense Search:** HNSW Cosine vector search in `pgvector` (Top 20).
- **Sparse Search:** PostgreSQL Full-Text Search using `to_tsvector('english', content)` (Top 20).
- **Reranking:** Reciprocal Rank Fusion (RRF) to combine dense and sparse ranks into a single score:
  $$RRF(d) = \frac{1}{60 + \text{Rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{Rank}_{\text{sparse}}(d)}$$
- **Top-K Selection:** Select top 8 chunks (capped at ~3,500 tokens).

### 16–17. Context Construction & Prompts
- Enclose code snippets inside explicit `<context_chunk>` delimiters with file path and line numbers.
- System prompt instructs LLM to treat context as passive data, preventing prompt injection attacks.

---

## 21–27. Database, API, & Storage Architecture
- **Database:** Single PostgreSQL 16 instance with `pgvector` and Full-Text Search.
- **Caching:** Redis 7 for user session tokens, rate limiting counters, and BullMQ queue states.
- **Ephemeral Storage:** Cloned Git repositories are stored in `/tmp/devassist-workspaces` with strict auto-purge after indexing completes.

---

## 28–31. Background Jobs & GitHub Integration
- **Queue System:** BullMQ workers handle repository cloning, AST parsing, and OpenAI embedding batch requests with exponential backoff.
- **GitHub OAuth:** Implements standard OAuth2 authorization code grant for user authentication.

---

## 32–38. Security, Observability, & Error Handling
- **Authentication:** Signed JWT stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- **Rate Limiting:** `express-rate-limit` + Redis store (100 API requests/minute, 20 AI completions/minute per user).
- **Zero Code Execution:** Ingested code is strictly treated as text for AST parsing; never compiled or executed.
- **Observability:** Winston JSON logging, Prometheus metrics at `/metrics`, OpenTelemetry tracing spans.

---

## 39–45. Testing & CI/CD Strategy
- **Unit Testing:** Jest for AST chunking, secret scrubber, and RRF reranking logic.
- **Integration Testing:** Supertest for REST API endpoints and auth guards.
- **E2E Testing:** Playwright for user login, repo upload, and streaming chat interaction.
- **CI/CD:** GitHub Actions workflow executing linting, type-checking, automated tests, and Docker container builds.

---

## 46–52. Docker & Deployment Architecture
- **Docker Compose:** Multi-container configuration running:
  - `web`: Nginx container serving compiled React SPA.
  - `api`: Node.js Express application container.
  - `db`: PostgreSQL 16 with `pgvector` pre-installed.
  - `redis`: Redis 7 Alpine.
- **Cost Optimization:** Use `gpt-4o-mini` for code explanation and simple queries, routing complex debugging to `gpt-4o`.

---

## 53–60. Folder Structure & Technical Roadmap
*(See [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [API_SPECIFICATION.md](./API_SPECIFICATION.md), and [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) for full technical breakdowns).*
