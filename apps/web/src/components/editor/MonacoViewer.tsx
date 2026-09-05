import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { X, FileCode } from 'lucide-react';

export const MonacoViewer: React.FC = () => {
  const { openTabs, activeTabId, setActiveTab, closeTab, activeLineHighlight } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Custom theme definition
    monaco.editor.defineTheme('devlens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
      ],
      colors: {
        'editor.background': '#090d16',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#1e293b40',
        'editorCursor.foreground': '#6366f1',
        'editorWhitespace.foreground': '#3b4252',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#475569',
      },
    });
    monaco.editor.setTheme('devlens-dark');

    // Scroll to highlighted line range if requested
    if (activeLineHighlight) {
      editor.revealLineInCenter(activeLineHighlight.start);
      editor.createDecorationsCollection([
        {
          range: new monaco.Range(
            activeLineHighlight.start,
            1,
            activeLineHighlight.end,
            1
          ),
          options: {
            isWholeLine: true,
            className: 'bg-primary/20 border-l-2 border-primary',
          },
        },
      ]);
    }
  };

  if (openTabs.length === 0 || !activeTab) {
    return (
      <div className="flex-1 bg-background flex flex-col items-center justify-center text-slate-500 select-none">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 shadow-xl">
          <FileCode className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-300">No file selected</p>
        <p className="text-xs text-slate-500 mt-1">Select a file from the explorer to view code</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Tab Bar */}
      <div className="h-10 bg-surface border-b border-border flex items-center px-2 space-x-1 overflow-x-auto select-none">
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t text-xs font-mono cursor-pointer transition-all border-t-2 ${
                isActive
                  ? 'bg-background text-primary-light border-primary font-medium'
                  : 'text-slate-400 border-transparent hover:bg-surfaceHover/50 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="hover:text-rose-400 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language={activeTab.language}
          value={activeTab.content}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            readOnly: true,
            smoothScrolling: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
};
