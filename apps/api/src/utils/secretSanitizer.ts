/**
 * High-entropy and credential detection scanner for pre-ingestion security sanitization
 */
export const SECRET_PATTERNS = [
  // AWS Access Key ID
  /AKIA[0-9A-Z]{16}/g,
  // AWS Secret Access Key (approximate format)
  /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/gi,
  // GitHub Personal Access Token (classic and fine-grained)
  /ghp_[0-9a-zA-Z]{36}/g,
  /github_pat_[0-9a-zA-Z_]{82}/g,
  // Generic JSON Web Tokens (JWT)
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  // RSA/ECDSA/OpenSSH Private Keys
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  // Slack Tokens
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
  // Stripe API Keys
  /sk_live_[0-9a-zA-Z]{24,34}/g,
  // Generic API Key assignments (e.g. API_KEY="abcdef123456...")
  /(?:api_key|apikey|secret_key|private_key|auth_token)\s*[:=]\s*["'][A-Za-z0-9-_]{16,}["']/gi,
];

/**
 * Sanitizes code content by replacing detected secrets and API keys with a secure placeholder
 */
export function sanitizeCodeContent(content: string): string {
  if (!content) return '';
  let sanitized = content;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }

  return sanitized;
}

/**
 * Checks if a string contains known secret patterns
 */
export function containsSecrets(content: string): boolean {
  if (!content) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}
