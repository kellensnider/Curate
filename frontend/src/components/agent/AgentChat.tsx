'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamAgentChat, type AgentEvent } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: string[];
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setStreamText('');
    setActiveTools([]);

    let accText = '';
    const usedTools: string[] = [];

    try {
      for await (const event of streamAgentChat(text, conversationHistory)) {
        if (event.type === 'text') {
          accText += event.text ?? '';
          setStreamText(accText);
        } else if (event.type === 'tool_call' && event.name) {
          usedTools.push(event.name);
          setActiveTools([...usedTools]);
        } else if (event.type === 'done') {
          if (event.history) setConversationHistory(event.history as unknown[]);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: accText, toolCalls: [...usedTools] },
          ]);
          setStreamText('');
          setActiveTools([]);
        }
      }
    } catch {
      setError('Could not reach the agent. Is the backend running?');
      setMessages((prev) => prev.slice(0, -1)); // remove optimistic user msg
    } finally {
      setLoading(false);
    }
  }, [loading, conversationHistory]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const STARTERS = [
    'Optimize my subscriptions',
    'What should I cancel?',
    'How much am I saving?',
  ];

  const TOOL_LABELS: Record<string, string> = {
    get_watchlist: 'Reading watchlist…',
    get_subscriptions: 'Checking subscriptions…',
    analyze_coverage: 'Analyzing coverage…',
    get_service_prices: 'Fetching prices…',
    activate_subscription: 'Activating service…',
    cancel_subscription: 'Cancelling service…',
    recommend_subscriptions: 'Computing recommendation…',
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[480px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-semibold text-white">Curate AI</span>
        <span className="text-xs text-zinc-500 ml-auto">Powered by Claude</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-zinc-400 text-sm mb-4">
              Ask me to optimize your plan, explain savings, or apply changes.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-white text-black rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                }`}
              >
                {msg.content}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.toolCalls.map((t) => (
                      <span key={t} className="text-xs text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded">
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              {activeTools.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {activeTools.map((t) => (
                    <span key={t} className="text-xs text-blue-400 flex items-center gap-1.5">
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        ⚙
                      </motion.span>
                      {TOOL_LABELS[t] ?? t}
                    </span>
                  ))}
                </div>
              )}
              {streamText ? (
                <p className="text-sm text-zinc-100 leading-relaxed">{streamText}</p>
              ) : (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center py-2">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Curate…"
          disabled={loading}
          className="flex-1 bg-zinc-800 text-white text-sm px-3.5 py-2 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-zinc-100 disabled:opacity-40 transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
