
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppointments } from "@/hooks/use-appointments";

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

export function useChatOptimized() {
  const { user } = useAuth();
  const { refreshAppointments } = useAppointments();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDisplayedWelcome, setHasDisplayedWelcome] = useState(false);
  const [conversationContext, setConversationContext] = useState<Record<string, any>>({});

  const welcomeMessage = {
    role: "assistant" as const,
    content: "👋 Welcome to GarageWizz AI Assistant! I'm here to help you with scheduling appointments, looking up vehicle information, managing clients, and answering automotive questions. How can I assist you today?"
  };

  // Function to format message content with markdown-like styling
  const formatMessage = useCallback((content: string) => {
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
  }, []);

  // Initialize chat and fetch history if user is logged in
  const initializeChat = useCallback(async () => {
    if (!hasDisplayedWelcome && messages.length === 0) {
      setMessages([welcomeMessage]);
      setHasDisplayedWelcome(true);
    }
    
    // If user is logged in, fetch recent conversation history
    if (user?.id && messages.length <= 1) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) {
          console.error('Error fetching chat history:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Get latest context from the most recent message
          const latestMessage = data[0];
          if (latestMessage.metadata && typeof latestMessage.metadata === 'object') {
            const metadata = latestMessage.metadata as any;
            if (metadata.context) {
              setConversationContext(metadata.context);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing chat context:', err);
      }
    }
  }, [user?.id, messages.length, hasDisplayedWelcome]);

  // Detect booking or appointment-related queries
  const detectIntentType = useCallback((message: string): { isBooking: boolean, isAppointmentQuery: boolean } => {
    const lowerMsg = message.toLowerCase();
    
    // Check for booking intent
    const bookingTerms = ['book', 'schedule', 'appointment', 'reserve', 'slot'];
    const isBooking = bookingTerms.some(term => lowerMsg.includes(term));
    
    // Check for appointment query intent
    const queryTerms = [
      'appointment', 'schedule', 'booking', 'have we got', 
      'do we have', 'show me', 'what are', 'list',
      'today', 'tomorrow', 'next week'
    ];
    const isAppointmentQuery = queryTerms.some(term => lowerMsg.includes(term));
    
    return { isBooking, isAppointmentQuery };
  }, []);

  // Send message with optimized error handling and fallbacks
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { isBooking, isAppointmentQuery } = detectIntentType(message);

      // Try GPT function first with automatic fallback to Gemini
      try {
        console.log('Invoking GPT Edge Function');
        
        const { data: gptData, error: gptError } = await supabase.functions.invoke('chat-with-gpt', {
          body: { 
            message,
            user_id: user.id
          }
        });

        if (gptError || !gptData?.response) {
          throw new Error(gptError?.message || 'No response from GPT');
        }

        // Extract metadata from GPT response
        const metadata = {
          intent: gptData.metadata?.query_type,
          confidence: gptData.metadata?.confidence,
          entities: gptData.metadata?.entities,
          context: gptData.metadata?.context
        };

        // Update context if present
        if (gptData.metadata?.context) {
          setConversationContext(gptData.metadata.context);
        }

        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(gptData.response),
          metadata
        }]);

        // Refresh appointments if needed
        if (gptData.response.toLowerCase().includes('booking is confirmed') || 
            gptData.response.toLowerCase().includes('appointment created') ||
            isAppointmentQuery) {
          refreshAppointments();
        }

      } catch (gptError) {
        console.log('Falling back to Gemini function', gptError);
        
        const { data: geminiData, error: geminiError } = await supabase.functions.invoke('chat-with-gemini', {
          body: { 
            message,
            user_id: user.id
          }
        });

        if (geminiError || !geminiData?.response) {
          throw new Error(geminiError?.message || 'No response from AI assistant');
        }

        // Extract metadata if present
        const metadata = {
          intent: geminiData.metadata?.query_type,
          confidence: geminiData.metadata?.confidence,
          entities: geminiData.metadata?.entities,
          context: geminiData.metadata?.context
        };
        
        // Update context if present
        if (geminiData.metadata?.context) {
          setConversationContext(geminiData.metadata.context);
        }
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(geminiData.response),
          metadata
        }]);

        // Refresh appointments if needed
        if (geminiData.response.toLowerCase().includes('booking is confirmed') || 
            geminiData.response.toLowerCase().includes('appointment created') ||
            isAppointmentQuery) {
          refreshAppointments();
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // User-friendly error message based on error type
      let errorMessage = "I apologize, but I'm having trouble processing your request at the moment. Please try again later.";
      
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "I'm having trouble connecting to the server. Please check your internet connection and try again.";
        } else if (error.message.includes("authenticated") || error.message.includes("session")) {
          errorMessage = "Your session appears to have expired. Please refresh the page and sign in again.";
        }
      }
      
      toast.error("Failed to get response from AI assistant");
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoading, formatMessage, detectIntentType, refreshAppointments]);

  // Clear chat messages and reset context
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasDisplayedWelcome(false);
    setConversationContext({});
  }, []);

  // Initialize chat on component mount
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    initializeChat,
    conversationContext
  };
}
