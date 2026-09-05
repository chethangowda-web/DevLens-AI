import Parser from 'tree-sitter';

// Tree-sitter Grammars
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TypeScript = require('tree-sitter-typescript').typescript;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TSX = require('tree-sitter-typescript').tsx;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const JavaScript = require('tree-sitter-javascript');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Python = require('tree-sitter-python');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Go = require('tree-sitter-go');

export function getParserForLanguage(languageOrExt: string): Parser | null {
  const lang = languageOrExt.toLowerCase().replace(/^\./, '');
  const parser = new Parser();

  switch (lang) {
    case 'ts':
    case 'typescript':
      parser.setLanguage(TypeScript);
      return parser;
    case 'tsx':
      parser.setLanguage(TSX);
      return parser;
    case 'js':
    case 'jsx':
    case 'javascript':
    case 'mjs':
    case 'cjs':
      parser.setLanguage(JavaScript);
      return parser;
    case 'py':
    case 'python':
      parser.setLanguage(Python);
      return parser;
    case 'go':
      parser.setLanguage(Go);
      return parser;
    default:
      return null;
  }
}
