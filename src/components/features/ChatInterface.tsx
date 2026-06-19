import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { ChatMessage } from '@/types';
import { generateId } from '@/lib/utils';
import { Send, Bot, User } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your BetaBook AI assistant. 👋\n\nYou can ask me anything about your business — how much you've made, who owes you, what you've spent, or get business advice. Just type your question!",
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  "How much did I make this week?",
  "Who owes me money?",
  "What are my top expenses?",
  "Give me a business summary",
];

export default function ChatInterface() {
  const { user } = useAuth();
  const { activeBusinessId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContext = async () => {
    const { data: txns } = await supabase.from('transactions').select('*')
      .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50);
    return txns || [];
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const context = await fetchContext();
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { messages: history, context, businessId: activeBusinessId },
    });

    if (error) {
      let errorMessage = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const textContent = await error.context?.text();
          errorMessage = textContent || error.message;
        } catch { /* ignore */ }
      }
      console.error('AI error:', errorMessage);
      toast.error('AI failed to respond. Please try again.');
      setLoading(false);
      return;
    }

    const aiMsg: ChatMessage = {
      id: generateId(), role: 'assistant',
      content: data?.message || "Sorry, something went wrong. Please try again.",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
              className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all whitespace-nowrap shadow-sm">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about your business..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center transition-all disabled:opacity-40 active:scale-95 hover:bg-blue-600">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-blue-500 text-white rounded-br-sm'
          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
      }`}>
        {msg.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}
