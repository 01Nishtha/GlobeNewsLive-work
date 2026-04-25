'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '**GlobeNews AI Analyst** at your service.\n\nI can help you with:\n- 🌍 Geopolitical analysis\n- ⚔️ Military intelligence assessment\n- 📊 Threat level evaluation\n- 🔍 Signal correlation analysis\n\nWhat would you like to know about?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: fullContent || 'I apologize, but I was unable to generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '**Error:** Unable to connect to the AI analyst. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      form?.requestSubmit();
    }, 100);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent-green hover:bg-accent-green/90 text-black font-bold shadow-lg shadow-accent-green/30 hover:shadow-accent-green/50 transition-all duration-300 flex items-center justify-center group"
          title="AI Intelligence Analyst"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-elevated border border-border-default rounded-xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-void/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-green/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">GlobeNews AI</h3>
                <p className="text-[10px] text-text-muted">Intelligence Analyst</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-accent-blue/20'
                      : 'bg-accent-green/20'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-accent-blue" />
                  ) : (
                    <Bot className="w-4 h-4 text-accent-green" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    message.role === 'user'
                      ? 'bg-accent-blue/10 text-white'
                      : 'bg-white/5 text-text-default'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="text-accent-green font-bold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-accent-orange italic">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-black/30 px-1 py-0.5 rounded text-[10px] font-mono">
                          {children}
                        </code>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-0.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-0.5">{children}</ol>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingContent && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent-green animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-white/5 text-text-default">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="text-accent-green font-bold">{children}</strong>
                      ),
                    }}
                  >
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !streamingContent && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent-green" />
                </div>
                <div className="flex items-center gap-1 px-3 py-2">
                  <Loader2 className="w-3 h-3 text-accent-green animate-spin" />
                  <span className="text-[10px] text-text-muted">Analyzing intelligence...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-border-default/50 flex gap-2 overflow-x-auto">
            {[
              { label: 'Middle East', query: 'What is the current situation in the Middle East?' },
              { label: 'Ukraine', query: 'Latest updates on Ukraine conflict' },
              { label: 'Threat Level', query: 'What is the current global threat assessment?' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.query)}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] text-text-muted hover:text-white whitespace-nowrap transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            id="chat-form"
            onSubmit={handleSubmit}
            className="px-4 py-3 border-t border-border-default flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about global intelligence..."
              className="flex-1 bg-void border border-border-default rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-accent-green hover:bg-accent-green/90 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
