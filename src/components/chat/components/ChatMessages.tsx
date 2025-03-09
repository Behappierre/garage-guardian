
// Update the ChatMessages component to support displaying conversation context indicators
import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: Record<string, string>;
    context?: {
      recentTopics?: string[];
      lastQueryType?: string;
      currentFlow?: {
        type: string;
        step: string;
      };
    };
  };
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  conversationContext?: Record<string, any>;
}

export function ChatMessages({ messages, isLoading, conversationContext }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to render a subtle context indicator if there's active context
  const renderContextIndicator = () => {
    if (!conversationContext || Object.keys(conversationContext).length === 0) {
      return null;
    }
    
    const { recentTopics, currentFlow } = conversationContext;
    
    if (currentFlow) {
      return (
        <div className="px-4 py-1 text-xs text-gray-500 bg-gray-100 rounded-full inline-block mb-2">
          <span>Current flow: {currentFlow.type} ({currentFlow.step})</span>
        </div>
      );
    }
    
    if (recentTopics && recentTopics.length > 0) {
      return (
        <div className="px-4 py-1 text-xs text-gray-500 bg-gray-100 rounded-full inline-block mb-2">
          <span>Recent topics: {recentTopics.slice(0, 2).join(', ')}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex items-start mb-4 animate-fade-in">
          <div className="bg-primary/10 rounded-lg px-3 py-2 mr-auto ml-0 max-w-[80%]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
      )}
      
      {messages.length > 1 && renderContextIndicator()}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
