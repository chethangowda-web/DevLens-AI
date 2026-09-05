# Technology Decision Matrix & Stack Selection
## Project: DevAssist

---

## 1. Architectural & Technology Trade-off Analysis

| Layer | Chosen Technology | Alternatives Evaluated | Why Chosen | Trade-offs & Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Architecture Style** | **Modular Monolith** | Microservices, Serverless Functions | Eliminates distributed systems overhead; unified database and simple local development. | Scaling requires scaling the entire app; handled cleanly with vertical scaling up to 50k users. |
| **Backend Runtime** | **Node.js 20 LTS (Express / TS)** | Python (FastAPI), Go (Gin) | Shared TypeScript types across frontend/backend; mature Tree-sitter bindings; strong streaming async I/O. | Python has more native machine learning libraries, but Node handles API and stream concurrency effortlessly. |
| **Database & Vectors** | **PostgreSQL 16 + `pgvector`** | Pinecone, Qdrant, Weaviate | Single ACID-compliant database for relational users/repos, full-text search, AND vector search. | Specialized vector DBs scale past 100M vectors better; pgvector is ideal for up to 10M chunks with lower cost. |
| **AST Parser** | **Tree-sitter** | Babel, Python `ast`, Custom Regex | Concrete syntax tree support for 40+ languages with high performance and error tolerance. | Requires native C compilation (node-gyp) during container builds. |
| **Frontend Framework**| **React 18 + Vite** | Next.js, SvelteKit | DevAssist is an authenticated web app dashboard; Vite SPA avoids SSR complexity while providing instant HMR. | No built-in SSR for SEO (unnecessary for a private developer tool). |
| **Code Editor** | **Monaco Editor** | CodeMirror, Ace Editor | The exact core editor behind VS Code; built-in diff viewer, syntax highlighting, and minimap support. | Larger bundle size compared to CodeMirror (~2.5MB vs 300KB). |
| **Async Jobs** | **BullMQ + Redis 7** | RabbitMQ, AWS SQS, Celery | Lightweight, high-throughput in-memory job processing with retry logic, progress reporting, and no vendor lock-in. | Requires running and persisting a Redis instance. |
| **Embedding Model** | **OpenAI `text-embedding-3-small`** | Cohere Embed, BGE-Large, Ollama | 1536 dimensions, strong semantic benchmark performance for code, cheap ($0.02 / 1M tokens). | External API dependency (can be swapped for local Ollama in air-gapped mode). |
| **LLM Inference** | **OpenAI (`gpt-4o-mini` & `gpt-4o`)** | Anthropic Claude 3.5, Llama-3-70B | Superior code reasoning, fast streaming latency, high token throughput. | API cost per token; mitigated by caching and prompt optimization. |

---

## 2. Final Recommended Production Stack

```
Frontend:
  - React 18 (TypeScript)
  - Vite (Build Tool & Dev Server)
  - Tailwind CSS + Radix UI (shadcn/ui)
  - Monaco Editor (@monaco-editor/react)
  - Zustand (Client State) + TanStack Query v5 (Server Cache)

Backend:
  - Node.js 20 LTS (TypeScript Strict Mode)
  - Express.js (Modular Monolith)
  - BullMQ (Background Job Queue)
  - Tree-sitter (Language Grammar Parser)

Database & Infrastructure:
  - PostgreSQL 16 with pgvector Extension
  - Redis 7 (Alpine)
  - Docker & Docker Compose (Multi-stage builds)
  - Nginx (Reverse Proxy & SSL Termination)

AI & Inference:
  - LLM: OpenAI API (gpt-4o for complex debug/review, gpt-4o-mini for explain/search)
  - Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
  - Reranking: Reciprocal Rank Fusion (RRF) algorithm
```
