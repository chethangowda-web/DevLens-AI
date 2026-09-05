# Security Architecture & Threat Model
## Project: DevAssist

---

## 1. Security Philosophy: Zero Code Execution
> **Core Principle:** DevAssist is an intelligence and analysis platform, NOT a remote execution sandbox.
> Ingested source code is strictly treated as static text for AST parsing and vector indexing.
> **The host application and worker containers NEVER compile, execute, or evaluate user-submitted code.**

---

## 2. STRIDE Threat Analysis & Mitigations

| Threat Category | Specific Attack Vector | DevAssist Engineering Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Forged JWT session token | Signed JWTs using SHA-256 with secrets rotated via environment variables. Tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. |
| **Tampering** | Malicious ZIP containing Path Traversal (`../../etc/shadow`) | Zip extraction resolves paths against an isolated sandbox folder. Any entry containing `..` or absolute prefixes (`/`) is rejected and aborts the job. |
| **Repudiation** | Unauthorized project deletion or sensitive query | Structured `audit_logs` table logs user ID, project ID, IP address, timestamp, and action for all mutating API requests. |
| **Information Disclosure** | Cross-tenant codebase exposure | Strict Row-Level Multi-Tenancy. All SQL queries for files, chunks, and messages filter by verified `user_id` and `project_id`. |
| **Denial of Service** | ZIP Bomb (e.g., 42KB decompressing to 50GB) | Strict extraction byte counters. If extracted files exceed 200MB or 2,000 files, decompression terminates immediately with an error. |
| **Elevation of Privilege** | Remote Code Execution via submitted repo | AST text parsing only via Tree-sitter. No `eval()`, `exec()`, or child process executions are invoked on user files. |

---

## 3. Pre-Ingestion Secret & Credential Redaction Engine

Before files are saved to the database or sent to embedding models, they pass through an in-memory secret detection scanner:

```typescript
// Regex Scanner Rules for High-Entropy Credentials
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,                                        // AWS Access Key ID
  /ghp_[0-9a-zA-Z]{36}/g,                                     // GitHub Personal Access Token
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT Tokens
  /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g, // Private Keys
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g                           // Slack Tokens
];

export function sanitizeCodeContent(content: string): string {
  let sanitized = content;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}
```

---

## 4. Server-Side Request Forgery (SSRF) Protection

When users supply a Git URL (`POST /api/v1/projects/:id/repositories/import-git`), the backend validates the target URL:
- Only allows `https://` protocols.
- DNS resolution checks: Resolves domain to IP before cloning and blocks private subnets:
  - `127.0.0.0/8` (Loopback)
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private networks)
  - `169.254.169.254` (Cloud Instance Metadata Service)

---

## 5. Rate Limiting & Abuse Prevention
- **General REST APIs:** 100 requests / minute per IP via Redis-backed `express-rate-limit`.
- **AI Streaming Endpoints:** 20 chat requests / minute per authenticated user.
- **Repository Ingestion:** Max 3 concurrent indexing jobs per user account.
