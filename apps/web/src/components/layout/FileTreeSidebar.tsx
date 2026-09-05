import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileJson, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Code2
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  content?: string;
  children?: FileNode[];
}

// Sample file tree for initial workspace demonstration
const sampleFileTree: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        id: 'src/auth',
        name: 'auth',
        path: 'src/auth',
        type: 'directory',
        children: [
          {
            id: 'src/auth/jwt.service.ts',
            name: 'jwt.service.ts',
            path: 'src/auth/jwt.service.ts',
            type: 'file',
            language: 'typescript',
            content: `// Sample Source Code\nimport jwt from 'jsonwebtoken';\n\nexport class JwtService {\n  static verifyToken(token: string) {\n    return jwt.verify(token, process.env.JWT_SECRET!);\n  }\n}`,
          },
          {
            id: 'src/auth/password.util.ts',
            name: 'password.util.ts',
            path: 'src/auth/password.util.ts',
            type: 'file',
            language: 'typescript',
            content: `// Password Hashing Utility\nimport { hash, verify } from '@node-rs/argon2';\n\nexport class PasswordUtil {\n  static async hash(pwd: string) {\n    return await hash(pwd);\n  }\n}`,
          },
        ],
      },
      {
        id: 'src/server.ts',
        name: 'server.ts',
        path: 'src/server.ts',
        type: 'file',
        language: 'typescript',
        content: `import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\napp.listen(PORT, () => {\n  console.log(\`Server listening on \${PORT}\`);\n});`,
      },
    ],
  },
  {
    id: 'package.json',
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    language: 'json',
    content: `{\n  "name": "devlens-demo",\n  "version": "1.0.0",\n  "main": "index.js"\n}`,
  },
  {
    id: 'README.md',
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    language: 'markdown',
    content: `# DevLens AI Workspace\n\nWelcome to your intelligent developer assistant workspace.`,
  },
];

export const FileTreeSidebar: React.FC = () => {
  const { openFile, activeTabId } = useWorkspaceStore();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/auth': true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders[node.path];
    const isSelected = activeTabId === node.id;

    if (node.type === 'directory') {
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            className="flex items-center space-x-1.5 py-1 px-2 text-slate-300 hover:bg-surfaceHover/80 hover:text-white rounded cursor-pointer text-xs font-mono transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-accent-amber" />
            ) : (
              <Folder className="w-4 h-4 text-accent-amber/80" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        onClick={() => {
          if (node.content) {
            openFile({
              id: node.id,
              name: node.name,
              path: node.path,
              language: node.language || 'typescript',
              content: node.content,
            });
          }
        }}
        style={{ paddingLeft: `${depth * 14 + 20}px` }}
        className={`flex items-center space-x-1.5 py-1 px-2 rounded cursor-pointer text-xs font-mono transition-colors ${
          isSelected
            ? 'bg-primary/20 text-primary-light font-medium border-l-2 border-primary'
            : 'text-slate-400 hover:bg-surfaceHover/60 hover:text-slate-200'
        }`}
      >
        {node.name.endsWith('.json') ? (
          <FileJson className="w-3.5 h-3.5 text-accent-cyan" />
        ) : node.name.endsWith('.md') ? (
          <FileText className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-accent-emerald" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <aside className="w-64 bg-surface/90 border-r border-border h-full flex flex-col select-none">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Code2 className="w-4 h-4 text-primary-light" />
          <span>Explorer</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {sampleFileTree.map((node) => renderNode(node, 0))}
      </div>
    </aside>
  );
};
