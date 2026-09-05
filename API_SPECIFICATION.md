# API Endpoint Specification
## Project: DevAssist

---

## 1. Overview & Standards
- **Base URL:** `/api/v1`
- **Authentication:** Bearer token via `Authorization: Bearer <token>` or HTTP-Only cookie `token`.
- **Response Format:** JSON (Standard Envelope) or `text/event-stream` for SSE streaming.

---

## 2. Authentication Endpoints

### 2.1 Register User
- **Method / Path:** `POST /api/v1/auth/register`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "developer@example.com",
    "password": "SecurePassword123!",
    "fullName": "Jane Developer"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "user": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "email": "developer@example.com",
      "fullName": "Jane Developer",
      "role": "developer"
    }
  }
  ```

### 2.2 Login User
- **Method / Path:** `POST /api/v1/auth/login`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "developer@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):** Sets `HttpOnly; Secure; SameSite=Strict` cookie and returns user profile.

---

## 3. Project & Repository Ingestion Endpoints

### 3.1 Create Project
- **Method / Path:** `POST /api/v1/projects`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "name": "E-Commerce Microservices",
    "description": "Backend monorepo containing auth, payment, and order services"
  }
  ```
- **Response (201 Created):** Returns created project object.

### 3.2 Ingest Repository via ZIP Upload
- **Method / Path:** `POST /api/v1/projects/:projectId/repositories/upload-zip`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data` (Field: `file` -> `.zip` file, max 50MB)
- **Response (202 Accepted):**
  ```json
  {
    "jobId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "repositoryId": "11223344-5566-7788-99aa-bbccddeeff00",
    "status": "QUEUED",
    "message": "Repository extraction and AST indexing enqueued successfully."
  }
  ```

### 3.3 Ingest Repository via Git Clone
- **Method / Path:** `POST /api/v1/projects/:projectId/repositories/import-git`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "gitUrl": "https://github.com/expressjs/express.git",
    "branch": "master"
  }
  ```
- **Response (202 Accepted):** Same payload as 3.2.

### 3.4 Check Ingestion Job Status
- **Method / Path:** `GET /api/v1/repositories/jobs/:jobId/status`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "jobId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "status": "PROCESSING",
    "progressPercent": 68,
    "totalFilesProcessed": 340,
    "totalChunksCreated": 1120
  }
  ```

---

## 4. Search & Code Intelligence Endpoints

### 4.1 Hybrid Natural Language Code Search
- **Method / Path:** `POST /api/v1/projects/:projectId/search`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "query": "Where is JWT verified in authentication middleware?",
    "topK": 5
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "filePath": "src/middleware/auth.ts",
        "startLine": 15,
        "endLine": 42,
        "symbolName": "verifyTokenMiddleware",
        "symbolType": "function",
        "score": 0.895,
        "snippet": "export const verifyTokenMiddleware = (req, res, next) => { ... }"
      }
    ]
  }
  ```

---

## 5. AI Chat & Specialized Assistance Endpoints

### 5.1 Streaming Repository Chat (SSE)
- **Method / Path:** `POST /api/v1/projects/:projectId/chat`
- **Auth Required:** Yes
- **Headers:** `Accept: text/event-stream`
- **Request Body:**
  ```json
  {
    "conversationId": "conv-uuid-123",
    "message": "How does the payment controller process Stripe webhooks?",
    "mode": "rag"
  }
  ```
- **SSE Stream Output:**
  ```text
  event: citation
  data: {"filePath":"src/controllers/payment.controller.ts","startLine":45,"endLine":78,"symbolName":"handleWebhook"}

  event: delta
  data: {"text":"The payment controller handles Stripe webhooks in `handleWebhook`..."}

  event: done
  data: {"promptTokens": 1240, "completionTokens": 185}
  ```

### 5.2 Standalone Code Explanation
- **Method / Path:** `POST /api/v1/ai/explain`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "code": "const memoize = (fn) => { const cache = new Map(); return (...args) => { ... } };",
    "targetAudience": "beginner"
  }
  ```
- **Response (200 OK):** Markdown formatted explanation with complexity analysis.

### 5.3 Error Diagnostic & Auto-Fixing (Debugger)
- **Method / Path:** `POST /api/v1/ai/debug`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "code": "async function getUser(id) { return await db.user.findUnique({ where: { id } }); }",
    "stackTrace": "TypeError: Cannot read properties of undefined (reading 'findUnique')\n at getUser (src/users.js:2:32)"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "rootCause": "The `db.user` client instance is undefined, likely due to an uninitialized Prisma/ORM client import.",
    "suggestedFix": "Ensure the database client is initialized or imported at the top of the module.",
    "unifiedDiff": "--- src/users.js\n+++ src/users.js\n@@ -1,3 +1,4 @@\n+import { db } from '../db/client';\n async function getUser(id) {\n   return await db.user.findUnique({ where: { id } });\n }"
  }
  ```
