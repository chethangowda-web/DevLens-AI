# System Architecture & Diagrams
## Project: DevAssist

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Client Tier (Developer Browser)"]
        UI[React 18 SPA + Vite]
        Monaco[Monaco Code Editor & Diff Viewer]
        Zustand[Zustand State Store]
        ReactQuery[TanStack React Query]
        UI --> Monaco
        UI --> Zustand
        UI --> ReactQuery
    end

    subgraph Ingress["Ingress / Gateway"]
        Nginx[Nginx Reverse Proxy / SSL Termination]
    end

    subgraph AppServer["Application Tier (Modular Monolith - Express.js)"]
        AuthMod[Auth & RBAC Module]
        RepoMod[Repository & Ingestion Module]
        ParserMod[Tree-sitter AST Parser]
        RAGMod[Hybrid Search & Retrieval Module]
        ChatMod[LLM Controller & Prompt Assembler]
        Worker[BullMQ Background Indexing Worker]
    end

    subgraph DataStore["Persistence & Cache Tier"]
        PG[(PostgreSQL 16 + pgvector)]
        REDIS[(Redis 7 - Queue & Session Cache)]
        TempFS[Ephemeral Disk / Cloned Repos]
    end

    subgraph ExternalAI["AI Provider Gateway"]
        OpenAI[OpenAI API - gpt-4o / text-embedding-3-small]
        Anthropic[Anthropic API - claude-3-5-sonnet]
    end

    Client <-->|HTTPS REST / SSE Stream| Nginx
    Nginx <--> AuthMod
    Nginx <--> RepoMod
    Nginx <--> RAGMod
    Nginx <--> ChatMod

    RepoMod --> TempFS
    RepoMod --> Worker
    Worker --> ParserMod
    Worker --> OpenAI
    Worker --> PG
    Worker <--> REDIS

    RAGMod --> PG
    ChatMod --> OpenAI
    ChatMod --> Anthropic
    AuthMod --> PG
    AuthMod --> REDIS
```

---

## 2. Repository Ingestion & Indexing Pipeline

```mermaid
flowchart TD
    A[User Submits Repo ZIP or Public Git URL] --> B[API Controller Enqueues Job in BullMQ]
    B --> C[BullMQ Worker Clones Git / Unpacks ZIP to /tmp]
    C --> D[Scan .gitignore & Filter Binary/Lock/.env Files]
    D --> E[Regex & Entropy Secret Scrubber]
    E --> F{Check Supported Extension?}
    F -- Yes (TS/JS/Python/Go) --> G[Tree-sitter AST Structural Parsing]
    F -- No (Markdown/YAML/Other) --> H[Character-Boundary Chunking]
    G --> I[Extract Functions/Classes + Prepend Breadcrumbs]
    H --> J[Compute Chunk SHA-256 Hash]
    I --> J
    J --> K[Batch Request to OpenAI Embedding API]
    K --> L[Store Chunks, Vectors, & TSVectors in PostgreSQL]
    L --> M[Purge Temp Workspace Files]
    M --> N[Update Repo Status to 'INDEXED' & Emit Completion]
```

---

## 3. Hybrid RAG & Query Retrieval Pipeline

```mermaid
flowchart LR
    UserQuery[User Query] --> DensePath[Generate Dense Query Embedding]
    UserQuery --> SparsePath[Generate Lexical TSQuery]

    DensePath --> VectorSearch["pgvector HNSW Cosine Search (Top 20)"]
    SparsePath --> KeywordSearch["PostgreSQL Full-Text Search (Top 20)"]

    VectorSearch --> RRF["Reciprocal Rank Fusion (RRF)"]
    KeywordSearch --> RRF

    RRF --> Filter["Top 8 Reranked Chunks (< 3,500 tokens)"]
    Filter --> PromptBuilder[Inject Chunks into Delimited System Prompt]
    PromptBuilder --> LLM[LLM Inference Engine]
    LLM --> SSEStream[SSE Streaming Response + Citations]
```

---

## 4. Authentication Flow (OAuth2 + Session Cookie)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant SPA as React Frontend
    participant API as Express API
    participant GH as GitHub OAuth
    participant DB as PostgreSQL

    Dev->>SPA: Click "Sign in with GitHub"
    SPA->>API: GET /api/v1/auth/github
    API->>GH: Redirect to OAuth Consent Page
    GH-->>Dev: Prompt User Consent
    Dev->>GH: Approve Access
    GH->>API: GET /api/v1/auth/github/callback?code=AUTH_CODE
    API->>GH: POST /login/oauth/access_token (Exchange Code)
    GH-->>API: Returns Access Token
    API->>GH: GET /user (Fetch Profile)
    GH-->>API: Returns User Profile (ID, Email, Name)
    API->>DB: Upsert User Profile into 'users' table
    API-->>SPA: Set-Cookie: token=JWT; HttpOnly; Secure; SameSite=Strict
    SPA->>API: GET /api/v1/auth/me (with Cookie)
    API-->>SPA: Return 200 OK + User State
```

---

## 5. End-to-End Chat & Code Citation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant UI as React UI (Monaco + Chat)
    participant API as Express Chat Controller
    participant RAG as Retrieval Engine
    participant DB as Postgres (pgvector)
    participant LLM as OpenAI GPT-4o

    Dev->>UI: Types question: "How does JWT verification work?"
    UI->>API: POST /api/v1/projects/:id/chat (SSE Request)
    API->>RAG: Retrieve context for query
    RAG->>DB: Execute Dense + Sparse Hybrid Search
    DB-->>RAG: Return Top-8 matched code chunks
    RAG-->>API: Formatted context blocks with file/line metadata
    API->>LLM: Stream prompt with context chunks
    LLM-->>API: First token chunk arrives
    API-->>UI: SSE event: citation (files & lines)
    loop Token Streaming
        LLM-->>API: Token delta
        API-->>UI: SSE event: delta (text)
    end
    LLM-->>API: Stream completed
    API->>DB: Persist user prompt & assistant response in 'messages' table
    API-->>UI: SSE event: done
```

---

## 6. Security Threat Model & Attack Surface

```mermaid
graph TD
    subgraph AttackSurfaces["Attack Surfaces & Threats"]
        T1["1. Path Traversal via Malicious ZIP (../../etc/passwd)"]
        T2["2. Prompt Injection inside Repo Comments"]
        T3["3. Secret & API Key Leakage to External LLMs"]
        T4["4. Malicious Code Ingestion (RCE Attempts)"]
        T5["5. Cross-Tenant Data Access"]
    end

    subgraph DefenseMechanisms["DevAssist Defense Architecture"]
        D1["Strict Path Normalization & Rejection of '..'"]
        D2["XML/JSON Delimited Context + Passive Data Prompting"]
        D3["In-Memory Regex & High-Entropy Secret Scrubber"]
        D4["Zero Host Execution Policy (AST Text Parsing Only)"]
        D5["Row-Level Multi-Tenancy (Strict user_id & project_id checks)"]
    end

    T1 --> D1
    T2 --> D2
    T3 --> D3
    T4 --> D4
    T5 --> D5
```
