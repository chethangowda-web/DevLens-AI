import { SymbolType } from './types';

/**
 * Prepends structural breadcrumbs to code chunk contents
 */
export function buildBreadcrumbHeader(
  filePath: string,
  symbolName: string | null,
  symbolType: SymbolType | null,
  startLine: number,
  endLine: number,
  parentScope?: string | null
): string {
  const parts: string[] = [];
  parts.push(`// Context: ${filePath} (Lines ${startLine}-${endLine})`);

  if (parentScope) {
    parts.push(`// Scope: ${parentScope}`);
  }

  if (symbolName && symbolType) {
    parts.push(`// ${symbolType.toUpperCase()}: ${symbolName}`);
  }

  return parts.join('\n');
}
