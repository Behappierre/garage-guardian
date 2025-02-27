
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MessagesSquare, Send, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppointments } from "@/hooks/use-appointments";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatAgent() {
  const { user } = useAuth();
  const { refreshAppointments } = useAppointments();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const formatMessage = (content: string) => {
    return content
      .replace(/^([A-Za-z ]+):/gm, '**$1:**')
      .replace(/^- /gm, '• ')
      .replace(/\n\n/g, '\n\n---\n\n')
      .replace(/Bay \d+/g, '**$&**')
      .replace(/Status:/g, '**Status:**')
      .replace(/Vehicle:/g, '**Vehicle:**')
      .replace(/Customer:/g, '**Customer:**')
      .replace(/Service Details:/g, '**Service Details:**')
      .replace(/Job Ticket:/g, '**Job Ticket:**')
      .replace(/Notes:/g, '**Notes:**');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('Attempting to invoke Edge Function with:', {
        functionName: 'chat-with-gemini',
        message: userMessage,
        userId: user?.id
      });

      // Basic validation
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Direct fetch to Edge Function as a fallback
      const response = await fetch(`${supabase.functions.url}/chat-with-gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: user.id
        })
      });

      console.log('Raw response:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error response:', errorText);
        throw new Error(`Edge Function returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Parsed response data:', data);

      if (!data.response) {
        throw new Error('No response received from AI assistant');
      }

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: formatMessage(data.response)
      }]);

      if (data.response.toLowerCase().includes('booking is confirmed') || 
          data.response.toLowerCase().includes('appointment created')) {
        refreshAppointments();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get response from AI assistant");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble processing your request at the moment. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  const toggleWidth = () => {
    setIsWide(prev => !prev);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        >
          <MessagesSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className={`${isWide ? 'w-[800px]' : 'w-[400px] sm:w-[540px]'} overflow-hidden`}>
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>AI Assistant</SheetTitle>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleWidth}
              className="h-8 w-8"
              title={isWide ? "Narrow view" : "Wide view"}
            >
              {isWide ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClearChat}
              className="h-8 w-8"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 mt-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex ${
                    message.role === "assistant" ? "justify-start" : "justify-end"
                  }`}
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
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
