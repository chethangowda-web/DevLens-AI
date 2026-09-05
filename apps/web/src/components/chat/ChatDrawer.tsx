import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { chatService } from '../../services/chatService';
import { ChatMessage, ChatMessageItem } from './ChatMessage';
import { Conversation, CodeCitation } from '@devlens/types';
import {
  Send,
  Sparkles,
  Code,
  Bug,
  FileSearch,
  Bot,
  Plus,
  Square,
  ChevronDown,
  X,
  History,
} from 'lucide-react';

export const ChatDrawer: React.FC = () => {
  const { isChatOpen, activeProject, activeRepo, toggleChat } = useWorkspaceStore();

  const [mode, setMode] = useState<'chat' | 'explain' | 'debug' | 'search'>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConvDropdown, setShowConvDropdown] = useState(false);

  const abortStreamRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations when active project changes
  useEffect(() => {
    if (!activeProject) return;

    const loadConversations = async () => {
      try {
        const list = await chatService.getConversations(activeProject.id);
        setConversations(list);
        if (list.length > 0 && !activeConversationId) {
          setActiveConversationId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };

    loadConversations();
  }, [activeProject]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeProject || !activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const msgs = await chatService.getMessages(activeProject.id, activeConversationId);
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            senderType: m.senderType,
            content: m.content,
            citations: m.citations,
          }))
        );
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      }
    };

    loadMessages();
  }, [activeProject, activeConversationId]);

  if (!isChatOpen) return null;

  const handleStartNewChat = async () => {
    if (!activeProject) return;
    setActiveConversationId(null);
    setMessages([]);
    setShowConvDropdown(false);
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    setShowConvDropdown(false);
  };

  const handleStopGeneration = () => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === prev.length - 1 ? { ...m, isStreaming: false } : m
      )
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeProject || isGenerating) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    // Add user message to UI immediately
    const userMsgItem: ChatMessageItem = {
      senderType: 'user',
      content: userText,
    };

    // Prepare placeholder assistant message for streaming
    const assistantPlaceholder: ChatMessageItem = {
      senderType: 'assistant',
      content: '',
      citations: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsgItem, assistantPlaceholder]);
    setIsGenerating(true);

    try {
      let accumulatedContent = '';
      let accumulatedCitations: CodeCitation[] = [];

      const cancelStream = await chatService.streamChat({
        projectId: activeProject.id,
        repositoryId: activeRepo?.id,
        conversationId: activeConversationId || undefined,
        message: userText,
        mode,
        onCitation: (citations) => {
          accumulatedCitations = citations;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.senderType === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                citations: accumulatedCitations,
              };
            }
            return updated;
          });
        },
        onDelta: (delta) => {
          accumulatedContent += delta;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.senderType === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: accumulatedContent,
              };
            }
            return updated;
          });
        },
        onDone: (data) => {
          setIsGenerating(false);
          abortStreamRef.current = null;

          if (!activeConversationId && data.conversationId) {
            setActiveConversationId(data.conversationId);
            // Refresh conversation list
            chatService.getConversations(activeProject.id).then(setConversations);
          }

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.senderType === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                id: data.assistantMessage?.id,
                content: accumulatedContent,
                citations: accumulatedCitations,
                isStreaming: false,
              };
            }
            return updated;
          });
        },
        onError: (err) => {
          console.error('Streaming error:', err);
          setIsGenerating(false);
          abortStreamRef.current = null;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.senderType === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content:
                  accumulatedContent ||
                  `⚠️ Error generating response: ${err.message}`,
                isStreaming: false,
              };
            }
            return updated;
          });
        },
      });

      abortStreamRef.current = cancelStream;
    } catch (err: any) {
      console.error('Failed to initiate chat stream:', err);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-[420px] bg-surface border-l border-border h-full flex flex-col z-20 select-none">
      {/* Header & Controls */}
      <div className="p-3 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-light" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-white">
              DevLens Assistant
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-accent-emerald border border-accent-emerald/20 font-mono">
              {activeRepo ? `RAG: ${activeRepo.name}` : 'RAG Ready'}
            </span>
            <button
              onClick={toggleChat}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Close chat panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Bar */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="relative flex-1">
            <button
              onClick={() => setShowConvDropdown(!showConvDropdown)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-background border border-border/70 rounded-md text-[11px] text-slate-300 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <History className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  {conversations.find((c) => c.id === activeConversationId)?.title ||
                    'New Conversation'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
            </button>

            {showConvDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-xl py-1 z-30 max-h-48 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-slate-500 text-center">
                    No previous chats
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left px-3 py-1.5 text-[11px] truncate hover:bg-surfaceHover transition-colors flex items-center space-x-2 ${
                        conv.id === activeConversationId
                          ? 'text-primary-light font-medium bg-primary/10'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate">{conv.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleStartNewChat}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-surfaceHover hover:bg-border/60 border border-border rounded-md text-[11px] font-medium text-slate-200 transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-background rounded-lg border border-border/80">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'chat'
                ? 'bg-primary text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setMode('explain')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'explain'
                ? 'bg-primary text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>Explain</span>
          </button>
          <button
            onClick={() => setMode('debug')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'debug'
                ? 'bg-primary text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3 h-3" />
            <span>Debug</span>
          </button>
          <button
            onClick={() => setMode('search')}
            className={`flex items-center justify-center space-x-1 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'search'
                ? 'bg-primary text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-3 h-3" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-white">How can I help you?</h4>
              <p className="text-[11px] text-slate-400 max-w-[260px] leading-relaxed">
                Ask questions about your codebase, request line-by-line explanations, debug stack traces, or search symbols.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2 text-left">
              <button
                onClick={() => setInputMessage('Explain the architecture and main components of this repository')}
                className="w-full p-2 rounded-lg bg-background hover:bg-surfaceHover border border-border text-[11px] text-slate-300 transition-colors"
              >
                💡 Explain repository architecture
              </button>
              <button
                onClick={() => setInputMessage('Where is authentication and user authorization handled?')}
                className="w-full p-2 rounded-lg bg-background hover:bg-surfaceHover border border-border text-[11px] text-slate-300 transition-colors"
              >
                🔒 Where is authentication handled?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-surface/50">
        <div className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'explain'
                ? 'Highlight code or ask for explanation...'
                : mode === 'debug'
                ? 'Paste error stack trace or describe the bug...'
                : mode === 'search'
                ? 'Search for functions, interfaces, or classes...'
                : 'Ask anything about this repository...'
            }
            rows={2}
            disabled={isGenerating}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none disabled:opacity-50"
          />

          {isGenerating ? (
            <button
              onClick={handleStopGeneration}
              className="absolute right-2 bottom-2.5 p-1.5 rounded-md bg-rose-500/80 hover:bg-rose-500 text-white transition-colors shadow"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="absolute right-2 bottom-2.5 p-1.5 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors shadow disabled:opacity-40 disabled:hover:bg-primary"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500 font-mono">
          <span>GPT-4o / Hybrid RAG Active</span>
          <span>Enter to send · Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
