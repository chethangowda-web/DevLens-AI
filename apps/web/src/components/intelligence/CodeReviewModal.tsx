import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { intelligenceService } from '../../services/intelligenceService';
import { CodeReviewResponse, CodeReviewIssue } from '@devlens/types';
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  X,
  AlertTriangle,
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';

export const CodeReviewModal: React.FC = () => {
  const {
    isCodeReviewOpen,
    setCodeReviewOpen,
    activeProject,
    openTabs,
    activeTabId,
    highlightLines,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CodeReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab?.content) {
      setCode(activeTab.content);
    }
  }, [activeTab]);

  // Keyboard shortcut listener (Cmd+Shift+R or Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setCodeReviewOpen(!isCodeReviewOpen);
      }
      if (e.key === 'Escape' && isCodeReviewOpen) {
        setCodeReviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCodeReviewOpen, setCodeReviewOpen]);

  if (!isCodeReviewOpen) return null;

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !activeProject) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await intelligenceService.reviewCode({
        projectId: activeProject.id,
        code: code.trim(),
        language: activeTab?.language || 'typescript',
        filePath: activeTab?.path || 'snippet',
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to complete code review');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleJumpToLine = (line?: number) => {
    if (line) {
      highlightLines(line, line);
      setCodeReviewOpen(false);
    }
  };

  const filteredIssues = result?.issues.filter((issue) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'CRITICAL' || selectedFilter === 'WARNING' || selectedFilter === 'INFO') {
      return issue.severity === selectedFilter;
    }
    return issue.category === selectedFilter;
  }) || [];

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        label: 'Optimal / Secure',
        icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      };
    }
    if (score >= 60) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        label: 'Moderate Risk',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      };
    }
    return {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      label: 'High Risk / Action Required',
      icon: <Flame className="w-5 h-5 text-rose-400" />,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Automated Code Review & OWASP Scanner</h3>
              <p className="text-[11px] text-slate-400">
                Static security auditing, vulnerability detection, and anti-pattern analysis
              </p>
            </div>
          </div>
          <button
            onClick={() => setCodeReviewOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleReview} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Source Code for Audit {activeTab ? `(${activeTab.name})` : ''}
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {code.split('\n').length} lines • {activeTab?.language || 'typescript'}
              </span>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste or review code snippet..."
              rows={5}
              className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running OWASP Security Scan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Security & Quality Review</span>
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
              {/* Score & Summary Card */}
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
                <div className="md:col-span-3 p-3.5 bg-background border border-border/80 rounded-xl flex flex-col justify-center space-y-1">
                  <span className="text-xs font-semibold text-slate-200">Executive Audit Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { id: 'ALL', label: `All Issues (${result.issues.length})` },
                  { id: 'CRITICAL', label: 'Critical', color: 'text-rose-400' },
                  { id: 'WARNING', label: 'Warning', color: 'text-amber-400' },
                  { id: 'INFO', label: 'Info', color: 'text-cyan-400' },
                  { id: 'SECURITY', label: 'Security' },
                  { id: 'PERFORMANCE', label: 'Performance' },
                  { id: 'CODE_SMELL', label: 'Code Smell' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      selectedFilter === f.id
                        ? 'bg-primary text-white shadow'
                        : 'bg-background border border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={selectedFilter !== f.id ? f.color : ''}>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Issues List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredIssues.length === 0 ? (
                  <div className="p-6 bg-background/50 border border-border/60 rounded-xl text-center space-y-1">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-200">No issues found for this filter</div>
                    <div className="text-[11px] text-slate-400">Your code passed all selected criteria cleanly.</div>
                  </div>
                ) : (
                  filteredIssues.map((issue: CodeReviewIssue, idx: number) => {
                    const severityStyles = {
                      CRITICAL: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
                      WARNING: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
                      INFO: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
                    }[issue.severity];

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-lg border bg-background/90 ${
                          issue.severity === 'CRITICAL' ? 'border-rose-500/30' : 'border-border'
                        } space-y-2`}
                      >
                        {/* Issue Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${severityStyles}`}
                            >
                              {issue.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-slate-400">
                              {issue.category}
                            </span>
                            {issue.line && (
                              <button
                                onClick={() => handleJumpToLine(issue.line)}
                                className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface hover:bg-surfaceHover border border-border text-primary-light hover:text-white transition-colors"
                                title="Jump to Line in Editor"
                              >
                                <span>Line {issue.line}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Recommendation */}
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{issue.issue}</div>
                          <div className="text-xs text-slate-300 mt-1 leading-relaxed">{issue.recommendation}</div>
                        </div>

                        {/* Suggested Code */}
                        {issue.suggestedCode && (
                          <div className="space-y-1 bg-surface rounded-md p-2 border border-border/80 text-[11px] font-mono">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Recommended Replacement:</span>
                              <button
                                onClick={() => handleCopy(issue.suggestedCode!, idx)}
                                className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Fix</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-emerald-400 whitespace-pre-wrap overflow-x-auto pt-1">
                              {issue.suggestedCode}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
