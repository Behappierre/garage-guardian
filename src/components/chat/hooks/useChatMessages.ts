
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

export function useChatMessages() {
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

  const checkIfBookingRequest = (message: string): boolean => {
    const bookingTerms = ['book', 'schedule', 'appointment', 'reserve', 'slot'];
    return bookingTerms.some(term => message.toLowerCase().includes(term));
  };

  const checkIfAppointmentQuery = (message: string): boolean => {
    const queryTerms = [
      'appointment', 'schedule', 'booking', 'have we got', 
      'do we have', 'show me', 'what are', 'list',
      'today', 'tomorrow', 'next week'
    ];
    return queryTerms.some(term => message.toLowerCase().includes(term));
  };

  const sendMessage = async (message: string) => {
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

      const isLikelyBookingRequest = checkIfBookingRequest(message);
      const isLikelyAppointmentQuery = checkIfAppointmentQuery(message);

      try {
        console.log('Attempting to invoke GPT Edge Function with:', {
          message,
          userId: user.id,
          isLikelyBooking: isLikelyBookingRequest || isLikelyAppointmentQuery
        });
        
        const { data: gptData, error: gptError } = await supabase.functions.invoke('chat-with-gpt', {
          body: { 
            message,
            user_id: user.id
          }
        });

        console.log('Response from GPT Edge Function:', { data: gptData, error: gptError });

        if (gptError) {
          console.warn('GPT function error, falling back to Gemini:', gptError);
          throw gptError;
        }

        if (!gptData?.response) {
          console.warn('No response from GPT, falling back to Gemini');
          throw new Error('No response received from GPT assistant');
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

        if (gptData.response.toLowerCase().includes('booking is confirmed') || 
            gptData.response.toLowerCase().includes('appointment created')) {
          console.log("Booking confirmed, refreshing appointments");
          refreshAppointments();
        }

        // Also refresh appointments if the query was about appointments
        if (isLikelyAppointmentQuery) {
          console.log("Appointment query detected, refreshing appointments to ensure latest data");
          refreshAppointments();
        }

        return;
      } catch (gptError) {
        console.log('Falling back to chat-with-gemini function');
        
        const { data: geminiData, error: geminiError } = await supabase.functions.invoke('chat-with-gemini', {
          body: { 
            message,
            user_id: user.id
          }
        });

        console.log('Response from Gemini Edge Function:', { data: geminiData, error: geminiError });

        if (geminiError) {
          console.error('Gemini function error:', geminiError);
          throw geminiError;
        }

        if (!geminiData?.response) {
          throw new Error('No response received from AI assistant');
        }

        // Extract context if present in the response
        if (geminiData.metadata && typeof geminiData.metadata === 'object') {
          const metadata = geminiData.metadata as any;
          if (metadata.context) {
            setConversationContext(metadata.context);
          }
        }
        
        // Extract metadata if present in the response
        const metadata = {
          intent: geminiData.metadata?.query_type,
          confidence: geminiData.metadata?.confidence,
          entities: geminiData.metadata?.entities,
          context: geminiData.metadata?.context
        };
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(geminiData.response),
          metadata
        }]);

        if (geminiData.response.toLowerCase().includes('booking is confirmed') || 
            geminiData.response.toLowerCase().includes('appointment created')) {
          console.log("Booking confirmed, refreshing appointments");
          refreshAppointments();
        }
        
        // Also refresh appointments if the query was about appointments
        if (isLikelyAppointmentQuery) {
          console.log("Appointment query detected, refreshing appointments to ensure latest data");
          refreshAppointments();
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Use a more descriptive error message based on the error type
      let errorMessage = "I apologize, but I'm having trouble processing your request at the moment. Please try again later.";
      
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        
        if (error.message.includes("Failed to fetch") || error.message.includes("network")) {
          errorMessage = "I'm having trouble connecting to the AI service. This could be due to network issues or service unavailability. Please try again in a moment.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "The request to the AI service timed out. Please try again with a shorter message or try later when the system might be less busy.";
        } else if (error.message.includes("not authenticated") || error.message.includes("session")) {
          errorMessage = "Your session appears to have expired. Please refresh the page and sign in again to continue chatting.";
        }
      }
      
      toast.error("Failed to get response from AI assistant");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setHasDisplayedWelcome(false);
    setConversationContext({});
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    initializeChat,
    conversationContext
  };
}
