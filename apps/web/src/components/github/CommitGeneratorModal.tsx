import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { githubService } from '../../services/githubService';
import { CommitMessageResponse, CommitType } from '@devlens/types';
import {
  GitCommit,
  Loader2,
  X,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  Terminal,
  Tag,
} from 'lucide-react';

export const CommitGeneratorModal: React.FC = () => {
  const {
    isCommitGenOpen,
    setCommitGenOpen,
    openTabs,
    activeTabId,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const [diff, setDiff] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CommitMessageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCmdCopied, setIsCmdCopied] = useState(false);

  useEffect(() => {
    if (activeTab?.content && !diff) {
      setDiff(`diff --git a/${activeTab.path} b/${activeTab.path}\n--- a/${activeTab.path}\n+++ b/${activeTab.path}\n@@ -1,5 +1,10 @@\n+${activeTab.content.slice(0, 300)}`);
    }
  }, [activeTab, diff]);

  // Keyboard shortcut listener (Cmd+Shift+C or Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCommitGenOpen(!isCommitGenOpen);
      }
      if (e.key === 'Escape' && isCommitGenOpen) {
        setCommitGenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommitGenOpen, setCommitGenOpen]);

  if (!isCommitGenOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diff.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await githubService.generateCommit({
        diff: diff.trim(),
        context: context.trim() || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate commit message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (!result?.commitMessage) return;
    navigator.clipboard.writeText(result.commitMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyCommand = () => {
    if (!result?.commitMessage) return;
    const cmd = `git commit -m "${result.commitMessage.replace(/"/g, '\\"')}"`;
    navigator.clipboard.writeText(cmd);
    setIsCmdCopied(true);
    setTimeout(() => setIsCmdCopied(false), 2000);
  };

  const getTypeStyle = (type: CommitType) => {
    switch (type) {
      case 'feat':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
      case 'fix':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-300';
      case 'refactor':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-300';
      case 'test':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
      case 'docs':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
      default:
        return 'bg-slate-500/15 border-slate-500/40 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Conventional Commit Synthesizer</h3>
              <p className="text-[11px] text-slate-400">
                Generate standard Conventional Commit messages from git diffs
              </p>
            </div>
          </div>
          <button
            onClick={() => setCommitGenOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Optional Intent / Context Hint
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Implement refresh token rotation and JWT blacklist"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Git Diff Snippet (from git diff or staged files)
              </label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder="Paste unified git diff..."
                rows={5}
                className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !diff.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Message...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Commit Message</span>
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
            <div className="space-y-3.5 pt-2 border-t border-border">
              {/* Main Commit Result Box */}
              <div className="p-4 bg-background rounded-xl border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase border ${getTypeStyle(
                        result.type
                      )}`}
                    >
                      {result.type}
                    </span>
                    {result.scope && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-slate-300">
                        <Tag className="w-2.5 h-2.5 text-primary-light" />
                        <span>{result.scope}</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleCopyMessage}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-xs font-medium text-white transition-colors shadow"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied Message</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-surface rounded-lg border border-border/70 font-mono text-xs text-emerald-400 font-semibold select-all">
                  {result.commitMessage}
                </div>
              </div>

              {/* CLI Command Helper */}
              <div className="p-3 bg-background/80 rounded-lg border border-border/70 flex items-center justify-between space-x-3 text-xs">
                <div className="flex items-center space-x-2 font-mono text-slate-300 truncate">
                  <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">git commit -m &quot;{result.commitMessage}&quot;</span>
                </div>

                <button
                  onClick={handleCopyCommand}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-surface hover:bg-surfaceHover border border-border text-[11px] text-slate-300 hover:text-white transition-colors shrink-0"
                >
                  {isCmdCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy CLI Cmd</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
