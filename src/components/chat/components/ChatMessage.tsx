
import ReactMarkdown from 'react-markdown';

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

export interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        message.role === "assistant" ? "justify-start" : "justify-end"
      } animate-in slide-in-from-bottom-5 duration-300`}
    >
      <div
        className={`rounded-lg px-4 py-2 max-w-full break-words ${
          message.role === "assistant"
            ? "bg-muted prose prose-sm dark:prose-invert w-full"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {message.role === "assistant" ? (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
