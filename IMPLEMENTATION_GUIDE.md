# Implementation & Getting Started Guide
## Project: DevAssist

---

## 1. What to Build First
1. **The Tree-sitter Code Chunker & Secret Scrubber:** Verify that your AST parser correctly splits functions and classes in JavaScript/TypeScript/Python and extracts signatures with parent breadcrumbs.
2. **PostgreSQL + `pgvector` Hybrid Query:** Set up your Docker container and write the SQL function combining dense cosine similarity with `ts_rank_cd` full-text search.
3. **End-to-End Chat Pipeline:** Wire a minimal script or API route that takes a query, runs hybrid search, formats the prompt context, and streams the LLM completion to verify latency.

---

## 2. What NOT to Build Yet
- ❌ **Do NOT build a VS Code extension first.** The web application and core API must be 100% stable before maintaining multiple client extensions.
- ❌ **Do NOT build autonomous multi-step agent loops** that execute terminal commands or push Git commits automatically.
- ❌ **Do NOT build microservices or Kubernetes manifests.** A clean modular monolith running in Docker Compose will easily support your MVP and first 10,000 users.
- ❌ **Do NOT build a complex dynamic code execution sandbox** (keep to static AST parsing for MVP).

---

## 3. Top 10 Technical Risks & Mitigations

| # | Technical Risk | Impact | Concrete Engineering Mitigation |
| :- | :--- | :--- | :--- |
| **1** | **Tree-sitter Native Compilation Issues** | Build failures across OS environments (Windows vs Linux vs Mac). | Containerize parsing inside standard Docker Linux images; use pre-built Tree-sitter WASM / native bindings. |
| **2** | **Context Window Flooding & Hallucinations** | Providing too much context confuses the LLM and creates hallucinated answers. | Strict Top-8 RRF chunk filtering and token budgeting (< 3,500 prompt tokens). |
| **3** | **429 Rate Limits on AI APIs** | Requests fail during repository embedding generation. | BullMQ background queuing with exponential backoff retries and batching (up to 100 chunks/request). |
| **4** | **ZIP Decompression Bombs & Memory Spikes** | Malicious ZIP files crashing the Node.js process. | Streaming decompression with hard limits: abort if uncompressed size exceeds 200MB. |
| **5** | **Slow Vector Queries** | Unindexed vector tables degrading to sequential scans. | Create HNSW index (`USING hnsw (embedding vector_cosine_ops)`) with `m = 16, ef_construction = 64`. |
| **6** | **Stale Embeddings Desynchronization** | Code updates leave outdated vectors in the database. | Compute SHA-256 chunk hashes; only modified files/chunks are re-embedded on re-index. |
| **7** | **Prompt Injection via Code Comments** | Comments instructing the LLM to ignore system rules. | Wrap all context inside `<context_chunk>` delimiters and instruct LLM that context is strictly passive data. |
| **8** | **High LLM Token Costs** | Uncontrolled costs on repetitive user queries. | Cache identical query responses in Redis and use `gpt-4o-mini` for basic explanation queries. |
| **9** | **PostgreSQL Connection Pool Exhaustion** | Long-running SSE streaming connections holding database clients open. | Release database pool connections *before* initiating the LLM streaming response loop. |
| **10**| **Accidental Secret & API Key Leaks** | Committing `.env` or sending AWS keys to OpenAI. | Run regex and entropy scrubber on all text files before writing to the database or LLM. |

---

## 4. Top 10 Product Risks & Mitigations

| # | Product Risk | Mitigation |
| :- | :--- | :--- |
| **1** | **Low Retrieval Accuracy (Missing key files)** | Combine dense vector search with lexical BM25 search via Reciprocal Rank Fusion (RRF). |
| **2** | **Slow Repository Ingestion (> 3 minutes)** | Parallelize file reading and batch embedding calls in chunks of 50-100 files. |
| **3** | **Generic Answers (Ignoring project conventions)** | Prepend file breadcrumb headers (parent class, imports) to every context chunk. |
| **4** | **Complex Onboarding Friction** | Allow 1-click ZIP file drag-and-drop or public Git clone URL without requiring OAuth setup. |
| **5** | **Enterprise Code Security Concerns** | Clear privacy policy, local data isolation, zero-code-execution guarantee, and self-hosted path. |
| **6** | **Broken or Invalid Diff Generation** | Output unified standard diff format (`diff -u`) with line numbers for easy visual validation. |
| **7** | **Limited Language Support** | Support the 4 most common languages in MVP (TypeScript, JavaScript, Python, Go) before expanding. |
| **8** | **Cluttered UI / Poor UX** | Build an IDE-like 3-pane layout (Explorer, Monaco Editor, Chat Drawer) with keyboard shortcuts. |
| **9** | **Hallucinated Nonexistent Imports** | Ground prompt instructions strictly on available repo imports. |
| **10**| **Over-Promising Autonomous Capabilities** | Position the product as an intelligent assistant/copilot with human review, not an autonomous engineer. |

---

## 5. Skills to Learn Before Building This
1. **Abstract Syntax Tree (AST) Parsing:** Learn how Tree-sitter creates concrete syntax trees and how to query nodes (functions, classes).
2. **`pgvector` & Vector Indexing:** Learn HNSW indexing, cosine vs L2 distance, and writing hybrid queries in PostgreSQL.
3. **PostgreSQL Full-Text Search:** Learn `tsvector`, `tsquery`, and `ts_rank_cd` scoring.
4. **Server-Sent Events (SSE) Streaming:** Learn how to stream chunked data over HTTP in Node.js and consume it using React readable streams.
5. **Monaco Editor Integration:** Learn how to mount Monaco in React, create split-diff editors, and apply line highlighting.

---

## 6. Prerequisites
- **Node.js (v20 LTS)** and `pnpm` (`npm install -g pnpm`).
- **Docker & Docker Compose** installed and running.
- **OpenAI API Key** (or Anthropic API key).
- **Git** installed on the host system.

---

## 7. Recommended Development Order

```
[ Step 1 ] Initialize Monorepo & spin up Docker (Postgres with pgvector + Redis)
     │
     ▼
[ Step 2 ] Implement `packages/code-parser` (Tree-sitter AST parser + Secret Sanitizer)
     │
     ▼
[ Step 3 ] Run Database Migrations (DDL with HNSW vector index & TSVector triggers)
     │
     ▼
[ Step 4 ] Build BullMQ Ingestion Worker (ZIP Unpacker, Git Cloner, Batch Embedder)
     │
     ▼
[ Step 5 ] Build Hybrid Search Module (Dense Cosine + Sparse BM25 + RRF Reranking)
     │
     ▼
[ Step 6 ] Implement Express SSE Streaming Chat Controller & Prompt Builder
     │
     ▼
[ Step 7 ] Build React Frontend (Auth, Project Dashboard, Monaco Code Viewer, Chat Drawer)
     │
     ▼
[ Step 8 ] Add Error Diagnostic & Auto-Fix Diff Generator
     │
     ▼
[ Step 9 ] Write Unit & Integration Tests (Jest & Supertest)
     │
     ▼
[ Step 10 ] Containerize with Docker Compose & Setup GitHub Actions CI/CD
```
