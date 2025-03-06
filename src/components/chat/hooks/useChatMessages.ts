
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppointments } from "@/hooks/use-appointments";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChatMessages() {
  const { user } = useAuth();
  const { refreshAppointments } = useAppointments();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDisplayedWelcome, setHasDisplayedWelcome] = useState(false);

  const welcomeMessage = {
    role: "assistant" as const,
    content: "👋 Welcome to GarageWizz AI Assistant! I'm here to help you with scheduling appointments, looking up vehicle information, managing clients, and answering automotive questions. How can I assist you today?"
  };

  useEffect(() => {
    if (!hasDisplayedWelcome && messages.length === 0) {
      setMessages([welcomeMessage]);
      setHasDisplayedWelcome(true);
    }
  }, [hasDisplayedWelcome, messages.length]);

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

      try {
        console.log('Attempting to invoke GPT Edge Function with:', {
          message,
          userId: user.id,
          isLikelyBooking: isLikelyBookingRequest
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

        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: formatMessage(gptData.response)
        }]);

        if (gptData.response.toLowerCase().includes('booking is confirmed') || 
            gptData.response.toLowerCase().includes('appointment created')) {
          console.log("Booking confirmed, refreshing appointments");
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

  const clearMessages = () => {
    setMessages([]);
    setHasDisplayedWelcome(false);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  };
}
