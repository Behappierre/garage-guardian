
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={`flex ${
        role === "assistant" ? "justify-start" : "justify-end"
      } animate-in slide-in-from-bottom-5 duration-300`}
    >
      <div
        className={`rounded-lg px-4 py-2 max-w-full break-words ${
          role === "assistant"
            ? "bg-muted prose prose-sm dark:prose-invert w-full"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {role === "assistant" ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
