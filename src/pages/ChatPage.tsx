import ChatInterface from '@/components/features/ChatInterface';
import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-gray-900 font-heading font-bold text-base leading-none">AI Assistant</h2>
            <p className="text-gray-400 text-xs mt-0.5">Ask anything about your business</p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
