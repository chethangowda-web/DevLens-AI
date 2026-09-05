import path from 'path';

export const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  'coverage',
  '.idea',
  '.vscode',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  'target', // Rust/Java target folder
  'bin',
  'obj',
]);

export const IGNORED_EXTENSIONS = new Set([
  // Binaries / Compiled
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.pyc', '.class',
  // Archives
  '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z',
  // Media
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp4', '.mp3', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
  // Maps / Minified / Locks
  '.map', '.min.js', '.min.css', '.lock',
  // Database files
  '.db', '.sqlite', '.sqlite3',
]);

export const SUPPORTED_LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.rs': 'rust',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.sql': 'sql',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sh': 'shell',
  '.bash': 'shell',
};

/**
 * Validates if a given file path should be processed and indexed
 */
export function isIngestableFile(
  filePath: string,
  fileSizeBytes: number,
  maxSizeBytes = 500 * 1024 // 500 KB default
): { valid: boolean; reason?: string; language?: string } {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];
  const ext = path.extname(fileName).toLowerCase();

  // 1. Check directory ignore rules
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return { valid: false, reason: `Ignored directory: ${part}` };
    }
  }

  // 2. Reject sensitive environment files
  if (fileName.startsWith('.env') || fileName === '.npmrc' || fileName === 'id_rsa') {
    return { valid: false, reason: `Sensitive config file: ${fileName}` };
  }

  // 3. Reject package lock files
  if (fileName.endsWith('.lock') || fileName === 'package-lock.json' || fileName === 'pnpm-lock.yaml' || fileName === 'yarn.lock') {
    return { valid: false, reason: `Lock file: ${fileName}` };
  }

  // 4. Reject binary and non-code extensions
  if (IGNORED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `Ignored extension: ${ext}` };
  }

  // 5. Check file size constraint
  if (fileSizeBytes > maxSizeBytes) {
    return { valid: false, reason: `File exceeds size limit (${Math.round(fileSizeBytes / 1024)} KB)` };
  }

  // 6. Language detection
  const language = SUPPORTED_LANGUAGE_EXTENSIONS[ext] || 'text';

  return { valid: true, language };
}
