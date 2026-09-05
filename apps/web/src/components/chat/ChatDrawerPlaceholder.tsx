import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { 
  Send, 
  Sparkles, 
  Code, 
  Bug, 
  HelpCircle, 
  FileSearch, 
  Bot,
  Copy,
  Check
} from 'lucide-react';

export const ChatDrawerPlaceholder: React.FC = () => {
  const { isChatOpen } = useWorkspaceStore();
  const [mode, setMode] = useState<'chat' | 'explain' | 'debug' | 'search'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isChatOpen) return null;

  const sampleMessages = [
    {
      sender: 'assistant',
      text: 'Hello! I am **DevLens AI**, your repository assistant. You can ask questions about your codebase, request line-by-line explanations, debug stack traces, or search for symbols.',
      citations: [{ file: 'src/auth/jwt.service.ts', lines: '1-10' }],
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-96 bg-surface border-l border-border h-full flex flex-col z-20 select-none">
      {/* Header & Mode Switcher */}
      <div className="p-3 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-light" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-white">DevLens Assistant</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-accent-emerald border border-accent-emerald/20 font-mono">
            RAG Active
          </span>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-background rounded-lg border border-border/80">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'chat' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setMode('explain')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'explain' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>Explain</span>
          </button>
          <button
            onClick={() => setMode('debug')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'debug' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3 h-3" />
            <span>Debug</span>
          </button>
          <button
            onClick={() => setMode('search')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'search' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-3 h-3" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
        {sampleMessages.map((msg, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="capitalize text-primary-light font-medium">{msg.sender}</span>
              <button
                onClick={() => handleCopy(msg.text, idx)}
                className="hover:text-slate-200 flex items-center space-x-1"
              >
                {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border/70 text-slate-200 leading-relaxed">
              {msg.text}
            </div>
            {msg.citations && (
              <div className="flex flex-wrap gap-1 pt-1">
                {msg.citations.map((c, cIdx) => (
                  <span
                    key={cIdx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-surfaceHover border border-border text-[10px] font-mono text-primary-light cursor-pointer hover:border-primary transition-colors"
                  >
                    <HelpCircle className="w-2.5 h-2.5" />
                    <span>{c.file}:{c.lines}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-border bg-surface/50">
        <div className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              mode === 'explain'
                ? 'Highlight code or ask for explanation...'
                : mode === 'debug'
                ? 'Paste error stack trace or describe the bug...'
                : 'Ask anything about this repository...'
            }
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
          />
          <button
            onClick={() => {
              if (inputMessage.trim()) {
                console.log('Sending message:', inputMessage);
                setInputMessage('');
              }
            }}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500 font-mono">
          <span>GPT-4o / Claude 3.5</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
