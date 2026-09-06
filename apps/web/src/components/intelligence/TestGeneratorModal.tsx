import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { intelligenceService } from '../../services/intelligenceService';
import { TestGenerationResponse, TestFramework, TestCaseItem } from '@devlens/types';
import {
  FlaskConical,
  Loader2,
  X,
  Check,
  Copy,
  FileCode2,
  Layers,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const TestGeneratorModal: React.FC = () => {
  const {
    isTestGeneratorOpen,
    setTestGeneratorOpen,
    activeProject,
    openTabs,
    activeTabId,
    openFile,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');
  const [framework, setFramework] = useState<TestFramework>('jest');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (activeTab?.content) {
      setCode(activeTab.content);
      setFilePath(activeTab.path);

      // Auto-select framework based on file extension
      if (activeTab.path.endsWith('.py')) setFramework('pytest');
      else if (activeTab.path.endsWith('.go')) setFramework('go_test');
      else setFramework('jest');
    }
  }, [activeTab]);

  // Keyboard shortcut listener (Cmd+Shift+T or Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTestGeneratorOpen(!isTestGeneratorOpen);
      }
      if (e.key === 'Escape' && isTestGeneratorOpen) {
        setTestGeneratorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTestGeneratorOpen, setTestGeneratorOpen]);

  if (!isTestGeneratorOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !activeProject) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await intelligenceService.generateTests({
        projectId: activeProject.id,
        code: code.trim(),
        filePath: filePath || activeTab?.path || 'src/example.ts',
        language: activeTab?.language || 'typescript',
        framework,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate test suite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!result?.testCode) return;
    navigator.clipboard.writeText(result.testCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenInEditor = () => {
    if (!result) return;
    const testFileName = result.testFilePath.split('/').pop() || 'test.ts';
    const lang = result.framework === 'pytest' ? 'python' : result.framework === 'go_test' ? 'go' : 'typescript';

    openFile({
      id: result.testFilePath,
      name: testFileName,
      path: result.testFilePath,
      language: lang,
      content: result.testCode,
    });

    setTestGeneratorOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Automated Unit Test Generator</h3>
              <p className="text-[11px] text-slate-400">
                Synthesize idiomatic unit test suites with happy paths, boundary mocks, and edge cases
              </p>
            </div>
          </div>
          <button
            onClick={() => setTestGeneratorOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Path */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target File Path</label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="src/services/auth.service.ts"
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Framework Selector */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Testing Framework</label>
                <div className="grid grid-cols-5 gap-1 p-1 bg-background rounded-lg border border-border">
                  {(['jest', 'vitest', 'pytest', 'mocha', 'go_test'] as TestFramework[]).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setFramework(fw)}
                      className={`px-1.5 py-1 rounded text-[10px] font-mono font-medium uppercase transition-all ${
                        framework === fw
                          ? 'bg-primary text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fw === 'go_test' ? 'GO' : fw}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Snippet */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Source Code to Test</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste code or edit source snippet..."
                rows={5}
                className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Test Suite...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Unit Tests</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* Header Info */}
              <div className="p-3.5 bg-background border border-border/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase bg-primary/20 text-primary-light border border-primary/30">
                      {result.framework}
                    </span>
                    <span className="text-xs font-mono text-slate-300 flex items-center space-x-1">
                      <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{result.testFilePath}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface hover:bg-surfaceHover border border-border text-xs text-slate-300 hover:text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Suite</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleOpenInEditor}
                      className="flex items-center space-x-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors shadow"
                    >
                      <span>Open in Editor Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
              </div>

              {/* Test Cases List */}
              {result.testCases && result.testCases.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Generated Test Specifications ({result.testCases.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {result.testCases.map((tc: TestCaseItem, idx: number) => {
                      const typeStyles = {
                        happy_path: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                        edge_case: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                        error_handling: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
                      }[tc.type] || 'bg-primary/10 border-primary/30 text-primary-light';

                      const typeLabel = {
                        happy_path: 'Happy Path',
                        edge_case: 'Edge Case',
                        error_handling: 'Error Guard',
                      }[tc.type] || tc.type;

                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-background border border-border/80 rounded-lg space-y-1 text-xs"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${typeStyles}`}
                          >
                            {typeLabel}
                          </span>
                          <div className="font-mono text-slate-200 text-[11px] font-medium leading-tight">
                            {tc.name}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-normal">{tc.description}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Code Preview */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">Test File Preview</div>
                <div className="p-3 bg-background rounded-lg border border-border max-h-64 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-slate-200 whitespace-pre leading-relaxed">
                    {result.testCode}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
