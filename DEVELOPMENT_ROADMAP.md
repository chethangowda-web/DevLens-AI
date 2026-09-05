# Development Roadmap (Phases 0 - 12)
## Project: DevAssist

---

## Roadmap Overview

```
Phase 0 ──> Phase 1 ──> Phase 2 ──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6 (MVP Release)
Plan        Setup       Auth        Core UI     Ingest      RAG         Assistant

Phase 7 ──> Phase 8 ──> Phase 9 ──> Phase 10 ──> Phase 11 ──> Phase 12
Analysis    GitHub      Testing     CI/CD        Deploy      Production Scale
```

---

## Phase Breakdown & Definition of Done (DoD)

### Phase 0: Planning & Architectural Alignment
- **Tasks:** Review PRD/TRD, define API contracts, set up project management boards.
- **Dependencies:** None.
- **Expected Output:** Approved technical specification documents.
- **DoD:** All architectural decisions signed off.

### Phase 1: Project & Infrastructure Setup
- **Tasks:** Turborepo initialization, Docker Compose for PostgreSQL (`pgvector`) & Redis 7, ESLint/Prettier setup.
- **Dependencies:** Phase 0.
- **Expected Output:** Running local database with `pgvector` extension enabled.
- **DoD:** `docker compose up -d` brings up healthy Postgres and Redis instances.

### Phase 2: Authentication & Multi-Tenancy
- **Tasks:** User registration/login, Argon2id hashing, GitHub OAuth2 flow, JWT session cookie middleware.
- **Dependencies:** Phase 1.
- **Expected Output:** Working auth endpoints and route protection guards.
- **DoD:** End-to-end user registration and GitHub OAuth verified with Postman/cURL.

### Phase 3: Core Workspace UI
- **Tasks:** React SPA setup with Vite, Tailwind CSS, Radix UI components, Monaco Editor, and collapsible file tree.
- **Dependencies:** Phase 2.
- **Expected Output:** Responsive IDE-grade workspace interface.
- **DoD:** User can log in, view the dashboard, and interact with the code viewer.

### Phase 4: Repository Ingestion & Parsing
- **Tasks:** ZIP file upload handler, Git clone worker, secret scrubber, Tree-sitter AST parser for TS, JS, Python, Go.
- **Dependencies:** Phase 3.
- **Expected Output:** Parsed structural code chunks with metadata and breadcrumbs stored in database.
- **DoD:** Ingesting a 50MB repository parses and chunks all files in < 60 seconds.

### Phase 5: Hybrid RAG & Vector Search Engine
- **Tasks:** BullMQ embedding worker, OpenAI batch embeddings, `pgvector` HNSW cosine indexing, PostgreSQL FTS, and RRF reranking.
- **Dependencies:** Phase 4.
- **Expected Output:** High-precision hybrid search API endpoint.
- **DoD:** Querying "Where is authentication handled?" returns exact files and line numbers in top-3 results.

### Phase 6: AI Streaming Assistant (MVP Release)
- **Tasks:** SSE streaming chat controller, structured prompt builder, token usage tracker, citation linking in UI.
- **Dependencies:** Phase 5.
- **Expected Output:** Fully functioning MVP developer assistant.
- **DoD:** Real-time token streaming with clickable citations highlighting code in the Monaco editor.

---

## Post-MVP Phases

### Phase 7: Code Analysis & Review Engine
- **Tasks:** Automated diff scanner, code smell detection, and security audit rules.
- **DoD:** Generates actionable review comments for submitted pull request diffs.

### Phase 8: GitHub App Integration
- **Tasks:** GitHub Webhook listener, PR comment automation, and automatic repo sync on push.
- **DoD:** Opening a PR on GitHub triggers automated DevAssist review comments.

### Phase 9: Comprehensive Test Suite
- **Tasks:** Unit tests (Jest), Integration tests (Supertest), E2E tests (Playwright).
- **DoD:** 80%+ code coverage across parsing, indexing, and retrieval modules.

### Phase 10: CI/CD Pipeline
- **Tasks:** GitHub Actions workflows for automated linting, test execution, and Docker container image publishing.
- **DoD:** Pull requests automatically build, test, and generate preview containers.

### Phase 11: Production Cloud Deployment
- **Tasks:** Nginx SSL termination, AWS/DigitalOcean VPS or ECS deployment, domain and DNS configuration.
- **DoD:** Production environment accessible via HTTPS with 99.9% uptime monitoring.

### Phase 12: Production Observability & Scale
- **Tasks:** OpenTelemetry tracing, Prometheus metrics (`/metrics`), Winston structured logging, Redis response caching.
- **DoD:** Latency dashboards and error alerts active in Grafana.
