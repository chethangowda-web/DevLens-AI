import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { intelligenceService } from '../../services/intelligenceService';
import { DebugResponse } from '@devlens/types';
import { Bug, Sparkles, Columns, Loader2, X, AlertCircle, CheckCircle2, FileCode } from 'lucide-react';

export const DebuggerModal: React.FC = () => {
  const {
    isDebuggerOpen,
    setDebuggerOpen,
    activeProject,
    activeRepo,
    openTabs,
    activeTabId,
    openDiff,
  } = useWorkspaceStore();

  const [stackTrace, setStackTrace] = useState('');
  const [includeActiveCode, setIncludeActiveCode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  // Keyboard shortcut listener (Cmd+Shift+D or Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebuggerOpen(!isDebuggerOpen);
      }
      if (e.key === 'Escape' && isDebuggerOpen) {
        setDebuggerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebuggerOpen, setDebuggerOpen]);

  if (!isDebuggerOpen) return null;

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stackTrace.trim() || !activeProject) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const codePayload = includeActiveCode && activeTab ? activeTab.content : undefined;
      const data = await intelligenceService.debugError({
        projectId: activeProject.id,
        stackTrace: stackTrace.trim(),
        code: codePayload,
        repositoryId: activeRepo?.id,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to diagnose error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDiff = () => {
    if (!result) return;
    openDiff(result.originalCode, result.modifiedCode);
    setDebuggerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Runtime Error & Stack Trace Debugger</h3>
              <p className="text-[11px] text-slate-400">
                Correlates crash logs to repository code and generates visual Before/After diffs
              </p>
            </div>
          </div>
          <button
            onClick={() => setDebuggerOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleDiagnose} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
                <span>Error Log / Stack Trace</span>
                <span className="text-slate-500 text-[10px] font-mono">Supports Node.js, Python, Go, Java traces</span>
              </label>
              <textarea
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste runtime crash stack trace (e.g. TypeError: Cannot read properties of undefined at src/auth/jwt.ts:15:20)..."
                rows={4}
                className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            {activeTab && (
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeActiveCode}
                  onChange={(e) => setIncludeActiveCode(e.target.checked)}
                  className="rounded border-border bg-background text-primary focus:ring-0"
                />
                <span className="flex items-center space-x-1">
                  <FileCode className="w-3.5 h-3.5 text-primary-light" />
                  <span>Include active editor file context ({activeTab.name})</span>
                </span>
              </label>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setStackTrace(
                    `TypeError: Cannot read properties of undefined (reading 'token')\n    at verifyToken (src/auth/jwt.service.ts:15:24)\n    at processRequest (src/server.ts:42:10)`
                  );
                }}
                className="px-3 py-1.5 bg-background hover:bg-surfaceHover border border-border text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors"
              >
                Insert Sample Trace
              </button>

              <button
                type="submit"
                disabled={isLoading || !stackTrace.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Diagnosing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Diagnose Bug</span>
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

          {/* Results View */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Root Cause Box */}
              <div className="p-3.5 bg-background border border-border/80 rounded-lg space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Root Cause Analysis</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{result.rootCause}</p>
              </div>

              {/* Fix Recommendation */}
              <div className="p-3.5 bg-background border border-border/80 rounded-lg space-y-1">
                <div className="flex items-center space-x-1.5 text-accent-emerald text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Recommended Fix</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{result.suggestedFix}</p>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-xs text-slate-300">
                  <span className="font-medium text-white">Visual Patch Ready:</span> Inspect side-by-side changes in Monaco.
                </div>
                <button
                  onClick={handleOpenDiff}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium transition-colors shadow"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>View Side-by-Side Diff</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
