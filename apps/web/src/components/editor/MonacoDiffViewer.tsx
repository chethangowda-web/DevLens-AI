import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { X, GitCompare } from 'lucide-react';

export const MonacoDiffViewer: React.FC = () => {
  const { isDiffMode, diffOriginal, diffModified, closeDiff } = useWorkspaceStore();

  if (!isDiffMode) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Diff Header */}
      <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-4 select-none">
        <div className="flex items-center space-x-2 text-xs font-mono text-accent-cyan">
          <GitCompare className="w-4 h-4" />
          <span className="font-semibold">Suggested Code Fix (Split Diff)</span>
        </div>
        <button
          onClick={closeDiff}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-surfaceHover text-slate-300 hover:text-white text-xs transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close Diff</span>
        </button>
      </div>

      {/* Monaco Diff Editor */}
      <div className="flex-1 w-full h-full">
        <DiffEditor
          height="100%"
          language="typescript"
          original={diffOriginal}
          modified={diffModified}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            readOnly: true,
            renderSideBySide: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};
