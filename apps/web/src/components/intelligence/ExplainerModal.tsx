import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { intelligenceService } from '../../services/intelligenceService';
import { CodeExplanationResponse } from '@devlens/types';
import { Code, Sparkles, Loader2, X, Clock, HardDrive, KeyRound, BookOpen, AlertCircle } from 'lucide-react';

export const ExplainerModal: React.FC = () => {
  const {
    isExplainerOpen,
    setExplainerOpen,
    activeProject,
    openTabs,
    activeTabId,
  } = useWorkspaceStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const [code, setCode] = useState('');
  const [audience, setAudience] = useState<'beginner' | 'intermediate' | 'architect'>('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CodeExplanationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab?.content) {
      setCode(activeTab.content);
    }
  }, [activeTab]);

  // Keyboard shortcut listener (Cmd+Shift+E or Ctrl+Shift+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setExplainerOpen(!isExplainerOpen);
      }
      if (e.key === 'Escape' && isExplainerOpen) {
        setExplainerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExplainerOpen, setExplainerOpen]);

  if (!isExplainerOpen) return null;

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !activeProject) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await intelligenceService.explainCode({
        projectId: activeProject.id,
        code: code.trim(),
        language: activeTab?.language || 'typescript',
        targetAudience: audience,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to explain code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Deep Code Explainer & Complexity Analyzer</h3>
              <p className="text-[11px] text-slate-400">
                Line-by-line architectural breakdown with algorithmic time and space complexity
              </p>
            </div>
          </div>
          <button
            onClick={() => setExplainerOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={handleExplain} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Code Snippet to Analyze {activeTab ? `(${activeTab.name})` : ''}
              </label>

              {/* Audience Selector */}
              <div className="flex items-center space-x-1 p-1 bg-background rounded-lg border border-border">
                {(['beginner', 'intermediate', 'architect'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAudience(level)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                      audience === level
                        ? 'bg-primary text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste or edit code snippet to explain..."
              rows={5}
              className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Code...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Explanation</span>
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
              {/* Summary */}
              <div className="p-3.5 bg-background border border-border/80 rounded-lg space-y-1">
                <div className="flex items-center space-x-1.5 text-primary-light text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Executive Summary</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{result.summary}</p>
              </div>

              {/* Complexity Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background border border-border/80 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time Complexity</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200 font-semibold">{result.complexity.time}</div>
                </div>

                <div className="p-3 bg-background border border-border/80 rounded-lg space-y-1">
                  <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-medium">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Space Complexity</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200 font-semibold">{result.complexity.space}</div>
                </div>
              </div>

              {/* Key Concepts */}
              {result.keyConcepts && result.keyConcepts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300">
                    <KeyRound className="w-3.5 h-3.5 text-accent-emerald" />
                    <span>Key Concepts & Patterns</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-surfaceHover border border-border text-[11px] text-slate-300 font-mono"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Line-by-Line Breakdown */}
              {result.lineByLine && result.lineByLine.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-300">Line-by-Line Breakdown</div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {result.lineByLine.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-background/80 border border-border/60 rounded-md text-xs flex items-start space-x-2"
                      >
                        <span className="font-mono text-slate-400 text-[11px] shrink-0 bg-surface px-1.5 py-0.5 rounded border border-border/50">
                          L{item.line}
                        </span>
                        <span className="text-slate-300 leading-relaxed">{item.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
