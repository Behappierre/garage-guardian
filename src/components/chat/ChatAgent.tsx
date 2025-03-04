
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessagesSquare, Send, Trash2, Maximize2, Minimize2, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppointments } from "@/hooks/use-appointments";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [hasDisplayedWelcome, setHasDisplayedWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message to show when the chat is first opened
  const welcomeMessage = {
    role: "assistant" as const,
    content: "👋 Welcome to GarageWizz AI Assistant! I'm here to help you with scheduling appointments, looking up vehicle information, managing clients, and answering automotive questions. How can I assist you today?"
  };

  // Display welcome message when chat is opened
  useEffect(() => {
    if (isOpen && !hasDisplayedWelcome && messages.length === 0) {
      setMessages([welcomeMessage]);
      setHasDisplayedWelcome(true);
    }
  }, [isOpen, hasDisplayedWelcome, messages.length]);

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
      .replace(/Notes:/g, '**Notes:**')
      .replace(/Booking is confirmed/g, '**Booking is confirmed**');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Basic validation
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Check if this might be a booking request to give priority to GPT
      const isLikelyBookingRequest = checkIfBookingRequest(userMessage);

      // Try GPT first now
      try {
        console.log('Attempting to invoke GPT Edge Function with:', {
          message: userMessage,
          userId: user.id,
          isLikelyBooking: isLikelyBookingRequest
        });
        
        const { data: gptData, error: gptError } = await supabase.functions.invoke('chat-with-gpt', {
          body: { 
            message: userMessage,
            user_id: user.id
          }
        });

        console.log('Response from GPT Edge Function:', { data: gptData, error: gptError });

        if (gptError) {
          console.warn('GPT function error, falling back to Gemini:', gptError);
          throw gptError; // This will trigger the fallback
        }

        if (!gptData?.response) {
          console.warn('No response from GPT, falling back to Gemini');
          throw new Error('No response received from GPT assistant');
        }

        // Success with GPT
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(gptData.response)
        }]);

        if (gptData.response.toLowerCase().includes('booking is confirmed') || 
            gptData.response.toLowerCase().includes('appointment created')) {
          console.log("Booking confirmed, refreshing appointments");
          refreshAppointments();
        }

        return; // Exit if successful
        
      } catch (gptError) {
        // Fall back to Gemini function
        console.log('Falling back to chat-with-gemini function');
        
        const { data: geminiData, error: geminiError } = await supabase.functions.invoke('chat-with-gemini', {
          body: { 
            message: userMessage,
            user_id: user.id
          }
        });

        console.log('Response from Gemini Edge Function:', { data: geminiData, error: geminiError });

        if (geminiError) {
          console.error('Gemini function error:', geminiError);
          throw geminiError;
        }

        if (!geminiData?.response) {
          throw new Error('No response received from Gemini assistant');
        }

        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(geminiData.response)
        }]);

        if (geminiData.response.toLowerCase().includes('booking is confirmed') || 
            geminiData.response.toLowerCase().includes('appointment created')) {
          console.log("Booking confirmed, refreshing appointments");
          refreshAppointments();
        }
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

  const checkIfBookingRequest = (message: string): boolean => {
    const bookingTerms = ['book', 'schedule', 'appointment', 'reserve', 'slot'];
    return bookingTerms.some(term => message.toLowerCase().includes(term));
  };

  const handleClearChat = () => {
    setMessages([]);
    setHasDisplayedWelcome(false);
    toast.success("Chat cleared");
  };

  const toggleWidth = () => {
    setIsWide(prev => !prev);
  };

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95"
        onClick={() => setIsOpen(true)}
      >
        <MessagesSquare className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className={cn(
            "max-h-[90vh] p-0 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300",
            isWide ? "sm:max-w-[800px]" : "sm:max-w-[400px] md:sm:max-w-[540px]"
          )}
          // This disables the automatic close button that is part of the Dialog component
          closeButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between p-4 border-b">
            <DialogTitle className="text-lg">AI Wizzard</DialogTitle>
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
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col h-[calc(90vh-8rem)]">
            <ScrollArea className="flex-1 px-4 pt-4">
              <div className="space-y-4">
                {messages.map((message, i) => (
                  <div
                    key={i}
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
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <form onSubmit={handleSubmit} className="p-4 flex gap-2 border-t">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={isLoading} className="h-10 w-10 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
