import { chunkCodeFile } from '../src/chunker';

describe('Tree-sitter AST Chunker Engine', () => {
  describe('TypeScript Parsing', () => {
    const tsCode = `
import { Jwt } from 'jsonwebtoken';

export class AuthService {
  private secret = 'my-secret';

  public async validateToken(token: string): Promise<boolean> {
    if (!token) return false;
    return true;
  }

  public async refreshToken(userId: string): Promise<string> {
    return 'new-token';
  }
}

export function helperUtil(x: number): number {
  return x * 2;
}
`;

    it('should parse TypeScript class, methods, and functions into structural chunks', () => {
      const chunks = chunkCodeFile('src/auth.service.ts', tsCode, 'typescript');

      expect(chunks.length).toBeGreaterThan(0);
      const classChunk = chunks.find((c) => c.symbolName === 'AuthService');
      expect(classChunk).toBeDefined();
      expect(classChunk?.symbolType).toBe('class');

      const methodChunk = chunks.find((c) => c.symbolName === 'validateToken');
      expect(methodChunk).toBeDefined();
      expect(methodChunk?.content).toContain('// Scope: AuthService');
      expect(methodChunk?.content).toContain('// METHOD: validateToken');

      const funcChunk = chunks.find((c) => c.symbolName === 'helperUtil');
      expect(funcChunk).toBeDefined();
      expect(funcChunk?.symbolType).toBe('function');
    });
  });

  describe('Python Parsing', () => {
    const pyCode = `
class UserValidator:
    def __init__(self, db_client):
        self.db = db_client

    def validate_email(self, email: str) -> bool:
        if "@" in email:
            return True
        return False

def calculate_discount(price: float) -> float:
    return price * 0.9
`;

    it('should parse Python classes and functions accurately', () => {
      const chunks = chunkCodeFile('services/validator.py', pyCode, 'python');

      expect(chunks.length).toBeGreaterThan(0);
      const classChunk = chunks.find((c) => c.symbolName === 'UserValidator');
      expect(classChunk).toBeDefined();

      const methodChunk = chunks.find((c) => c.symbolName === 'validate_email');
      expect(methodChunk).toBeDefined();
      expect(methodChunk?.content).toContain('// FUNCTION: validate_email');
    });
  });

  describe('Go Parsing', () => {
    const goCode = `
package main

import "fmt"

type Server struct {
	Port int
}

func (s *Server) Start() {
	fmt.Printf("Server listening on port %d\\n", s.Port)
}

func CalculateHash(data string) string {
	return "hash"
}
`;

    it('should parse Go struct methods and standalone functions', () => {
      const chunks = chunkCodeFile('main.go', goCode, 'go');

      expect(chunks.length).toBeGreaterThan(0);
      const funcChunk = chunks.find((c) => c.symbolName === 'CalculateHash');
      expect(funcChunk).toBeDefined();
      expect(funcChunk?.symbolType).toBe('function');
    });
  });

  describe('Fallback Line Chunking', () => {
    const mdCode = `# Title\n\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5`;

    it('should fall back to line chunking for Markdown files', () => {
      const chunks = chunkCodeFile('README.md', mdCode, 'markdown');

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('// Context: README.md');
      expect(chunks[0].symbolName).toBeNull();
    });
  });
});
