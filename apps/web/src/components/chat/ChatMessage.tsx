import React, { useState } from 'react';
import { MessageSender, CodeCitation } from '@devlens/types';
import { Bot, User, Copy, Check } from 'lucide-react';
import { CitationBadge } from './CitationBadge';

export interface ChatMessageItem {
  id?: string;
  senderType: MessageSender;
  content: string;
  citations?: CodeCitation[];
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.senderType === 'user';

  // Basic markdown code block parser
  const renderFormattedContent = (content: string) => {
    // If no code blocks, format basic paragraphs and bolding
    if (!content.includes('```')) {
      return (
        <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">
          {content}
        </div>
      );
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2.5 break-words">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const firstNewline = part.indexOf('\n');
            const language = firstNewline !== -1 ? part.slice(3, firstNewline).trim() : '';
            const code =
              firstNewline !== -1
                ? part.slice(firstNewline + 1, -3)
                : part.slice(3, -3);

            return (
              <div
                key={idx}
                className="my-2 rounded-lg bg-black/50 border border-border/80 overflow-hidden font-mono text-xs"
              >
                {language && (
                  <div className="flex items-center justify-between px-3 py-1 bg-surface border-b border-border/60 text-[10px] text-slate-400">
                    <span>{language}</span>
                  </div>
                )}
                <div className="p-3 overflow-x-auto text-slate-200">
                  <pre className="m-0 leading-relaxed font-mono">
                    <code>{code}</code>
                  </pre>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed text-slate-200">
              {part}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`space-y-1.5 p-3 rounded-lg border transition-all ${
        isUser
          ? 'bg-primary/10 border-primary/20 ml-6'
          : 'bg-background border-border/70 mr-2 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5 font-medium">
          {isUser ? (
            <div className="w-4 h-4 rounded bg-primary text-white flex items-center justify-center">
              <User className="w-2.5 h-2.5" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded bg-accent-emerald/20 text-accent-emerald flex items-center justify-center">
              <Bot className="w-2.5 h-2.5" />
            </div>
          )}
          <span className={isUser ? 'text-primary-light' : 'text-accent-emerald'}>
            {isUser ? 'You' : 'DevLens Assistant'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition-colors"
          title="Copy message"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="text-xs leading-relaxed">
        {renderFormattedContent(message.content)}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-primary-light ml-1 animate-pulse align-middle" />
        )}
      </div>

      {/* Citations */}
      {message.citations && message.citations.length > 0 && (
        <div className="pt-2 border-t border-border/40 space-y-1">
          <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
            Referenced Code Chunks:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, idx) => (
              <CitationBadge key={idx} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
