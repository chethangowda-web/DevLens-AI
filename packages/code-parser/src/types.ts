export type SymbolType =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'module';

export interface CodeChunk {
  content: string;
  startLine: number;
  endLine: number;
  symbolName: string | null;
  symbolType: SymbolType | null;
  chunkHash: string;
}

export interface ParseOptions {
  maxChunkTokens?: number; // Target tokens per chunk (default: 500)
  overlapLines?: number;   // Line overlap on fallback (default: 2)
}
