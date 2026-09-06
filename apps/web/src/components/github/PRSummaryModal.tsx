import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { githubService } from '../../services/githubService';
import { PRReviewSummary } from '@devlens/types';
import {
  GitPullRequest,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  FileDiff,
  Flame,
  Check,
  Copy,
  Layers,
} from 'lucide-react';

export const PRSummaryModal: React.FC = () => {
  const {
    isPRReviewOpen,
    setPRReviewOpen,
    openTabs,
    activeTabId,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const [prTitle, setPrTitle] = useState('feat: Update authentication & middleware');
  const [prNumber, setPrNumber] = useState<string>('42');
  const [diff, setDiff] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PRReviewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (activeTab?.content && !diff) {
      setDiff(`diff --git a/${activeTab.path} b/${activeTab.path}\n--- a/${activeTab.path}\n+++ b/${activeTab.path}\n@@ -1,10 +1,15 @@\n+${activeTab.content.slice(0, 500)}`);
    }
  }, [activeTab, diff]);

  // Keyboard shortcut listener (Cmd+Shift+P or Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPRReviewOpen(!isPRReviewOpen);
      }
      if (e.key === 'Escape' && isPRReviewOpen) {
        setPRReviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPRReviewOpen, setPRReviewOpen]);

  if (!isPRReviewOpen) return null;

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diff.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await githubService.summarizePR({
        diff: diff.trim(),
        prTitle: prTitle.trim() || undefined,
        prNumber: prNumber ? parseInt(prNumber, 10) : undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to summarize Pull Request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const markdown = `## PR Review Summary: ${result.prTitle || 'Pull Request'}\n\n` +
      `**Quality / Safety Score:** ${result.score}/100\n\n` +
      `### Overview\n${result.summary}\n\n` +
      `### What Changed\n${result.whatChanged.map((c) => `- ${c}`).join('\n')}\n\n` +
      `### Potential Risks\n${result.potentialRisks.map((r) => `- ⚠️ ${r}`).join('\n')}\n\n` +
      `### Recommendations\n${result.recommendations.map((r) => `- 💡 ${r}`).join('\n')}`;

    navigator.clipboard.writeText(markdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        label: 'Ready for Merge',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      };
    }
    if (score >= 65) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        label: 'Review Recommended',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      label: 'High Risk / Blockers',
      icon: <Flame className="w-5 h-5 text-rose-400" />,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Automated PR Diff Review & Summarizer</h3>
              <p className="text-[11px] text-slate-400">
                Changelog extraction, risk assessment, and merge readiness score
              </p>
            </div>
          </div>
          <button
            onClick={() => setPRReviewOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleSummarize} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-300 block mb-1">Pull Request Title</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="feat: implement JWT session refresh token rotation"
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">PR Number</label>
                <input
                  type="number"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  placeholder="42"
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Pull Request Unified Diff (from git diff main...feature)
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
                    <span>Analyzing PR Diff...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Summarize & Review PR</span>
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
              {/* Score & Header Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Score Card */}
                {(() => {
                  const badge = getScoreBadge(result.score);
                  return (
                    <div className={`p-4 rounded-xl border ${badge.bg} flex flex-col items-center justify-center space-y-1`}>
                      <div className="flex items-center space-x-1.5">
                        {badge.icon}
                        <span className="text-2xl font-bold font-mono tracking-tight">{result.score}</span>
                        <span className="text-xs text-slate-400">/100</span>
                      </div>
                      <span className="text-[11px] font-medium tracking-wide uppercase">{badge.label}</span>
                    </div>
                  );
                })()}

                {/* Summary Card */}
                <div className="md:col-span-3 p-3.5 bg-background border border-border/80 rounded-xl flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {result.prTitle} {result.prNumber ? `(#${result.prNumber})` : ''}
                    </span>
                    <button
                      onClick={handleCopySummary}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface hover:bg-surfaceHover border border-border text-[11px] text-slate-300 hover:text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied Markdown</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Review Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* What Changed & Potential Risks Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* What Changed */}
                <div className="p-3.5 bg-background border border-border/80 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-primary-light">
                    <FileDiff className="w-3.5 h-3.5" />
                    <span>What Changed ({result.whatChanged.length})</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.whatChanged.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-primary-light shrink-0 mt-1">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Potential Risks */}
                <div className="p-3.5 bg-background border border-border/80 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Potential Risks & Regressions</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.potentialRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
                        <span className="leading-relaxed">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-3.5 bg-background border border-border/80 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Actionable Review Recommendations</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-400 shrink-0 mt-0.5">💡</span>
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
