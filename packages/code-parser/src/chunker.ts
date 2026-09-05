import crypto from 'crypto';
import { SyntaxNode } from 'tree-sitter';
import { CodeChunk, ParseOptions, SymbolType } from './types';
import { getParserForLanguage } from './grammars';
import { buildBreadcrumbHeader } from './breadcrumbs';

// Target Node Types across Languages
const STRUCTURAL_NODE_TYPES = new Set([
  // TypeScript / JavaScript
  'function_declaration',
  'class_declaration',
  'method_definition',
  'interface_declaration',
  'type_alias_declaration',
  'export_statement',
  'arrow_function',

  // Python
  'function_definition',
  'class_definition',

  // Go
  'function_declaration',
  'method_declaration',
  'type_declaration',
]);

/**
 * Extracts symbol name from an AST Node if present
 */
function extractSymbolInfo(node: SyntaxNode): { symbolName: string | null; symbolType: SymbolType | null } {
  const type = node.type;

  let symbolType: SymbolType | null = null;
  if (type.includes('function')) symbolType = 'function';
  else if (type.includes('class')) symbolType = 'class';
  else if (type.includes('method')) symbolType = 'method';
  else if (type.includes('interface')) symbolType = 'interface';
  else if (type.includes('type')) symbolType = 'type';

  // Find child identifier node
  const nameNode = node.childForFieldName('name') || node.children.find((c) => c.type === 'identifier' || c.type === 'property_identifier' || c.type === 'type_identifier');

  return {
    symbolName: nameNode ? nameNode.text : null,
    symbolType,
  };
}

/**
 * Fallback line-based sliding window chunking for unsupported or plain text files
 */
function fallbackLineChunking(
  filePath: string,
  content: string,
  linesPerChunk = 40,
  overlapLines = 5
): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];

  let startLine = 1;
  while (startLine <= lines.length) {
    const endLine = Math.min(startLine + linesPerChunk - 1, lines.length);
    const rawSlice = lines.slice(startLine - 1, endLine).join('\n');

    const header = buildBreadcrumbHeader(filePath, null, null, startLine, endLine);
    const fullContent = `${header}\n${rawSlice}`;
    const chunkHash = crypto.createHash('sha256').update(fullContent).digest('hex');

    chunks.push({
      content: fullContent,
      startLine,
      endLine,
      symbolName: null,
      symbolType: null,
      chunkHash,
    });

    if (endLine === lines.length) break;
    startLine += linesPerChunk - overlapLines;
  }

  return chunks;
}

/**
 * Main Code Chunker entry point
 */
export function chunkCodeFile(
  filePath: string,
  content: string,
  language: string,
  _options: ParseOptions = {}
): CodeChunk[] {
  if (!content || !content.trim()) return [];

  const parser = getParserForLanguage(language);
  if (!parser) {
    return fallbackLineChunking(filePath, content);
  }

  try {
    const tree = parser.parse(content);
    const rootNode = tree.rootNode;
    const chunks: CodeChunk[] = [];
    const visitedNodes = new Set<SyntaxNode>();

    const traverse = (node: SyntaxNode, parentClass: string | null = null) => {
      let currentParentClass = parentClass;

      if (node.type.includes('class')) {
        const info = extractSymbolInfo(node);
        if (info.symbolName) {
          currentParentClass = info.symbolName;
        }
      }

      if (STRUCTURAL_NODE_TYPES.has(node.type) && !visitedNodes.has(node)) {
        visitedNodes.add(node);
        const { symbolName, symbolType } = extractSymbolInfo(node);

        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const rawCode = node.text;

        const header = buildBreadcrumbHeader(
          filePath,
          symbolName,
          symbolType,
          startLine,
          endLine,
          currentParentClass
        );

        const fullContent = `${header}\n${rawCode}`;
        const chunkHash = crypto.createHash('sha256').update(fullContent).digest('hex');

        chunks.push({
          content: fullContent,
          startLine,
          endLine,
          symbolName,
          symbolType,
          chunkHash,
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) traverse(child, currentParentClass);
      }
    };

    traverse(rootNode);

    // If no structural AST nodes were found, fall back to line chunking
    if (chunks.length === 0) {
      return fallbackLineChunking(filePath, content);
    }

    return chunks;
  } catch {
    // If Tree-sitter fails, fall back to line chunking safely
    return fallbackLineChunking(filePath, content);
  }
}
