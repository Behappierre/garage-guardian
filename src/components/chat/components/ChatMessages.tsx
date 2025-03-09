
import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";

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

  const hasContext = conversationContext && 
    (conversationContext.recentTopics?.length > 0 || 
     conversationContext.currentFlow || 
     Object.keys(conversationContext.entities || {}).length > 0);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Active context indicator */}
      {hasContext && (
        <div className="bg-muted/50 border border-border rounded-md p-3 mb-4 text-xs">
          <p className="font-semibold mb-1">Active Context</p>
          {conversationContext.recentTopics?.length > 0 && (
            <p className="text-muted-foreground">Topics: {conversationContext.recentTopics.join(', ')}</p>
          )}
          {conversationContext.currentFlow && (
            <p className="text-muted-foreground">Flow: {conversationContext.currentFlow.type} ({conversationContext.currentFlow.step})</p>
          )}
          {conversationContext.entities?.clients?.length > 0 && (
            <p className="text-muted-foreground">Client: {conversationContext.entities.clients[0].name}</p>
          )}
          {conversationContext.entities?.vehicles?.length > 0 && (
            <p className="text-muted-foreground">Vehicle: {conversationContext.entities.vehicles[0].description}</p>
          )}
        </div>
      )}
      
      {/* Messages */}
      <div className="space-y-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
