
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import { ChatLauncher } from "./components/ChatLauncher";
import { useChatMessages } from "./hooks/useChatMessages";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

export function ChatAgent() {
  const [isWide, setIsWide] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages, initializeChat, conversationContext } = useChatMessages();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen, initializeChat]);

  // Make sure we're visible on all pages
  useEffect(() => {
    console.log("ChatAgent mounted, user status:", user ? "logged in" : "not logged in");
  }, [user]);

  const toggleWidth = () => {
    setIsWide(prev => !prev);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    console.log("Sending message:", message);
    
    // Add retry mechanism for critical errors
    const maxRetries = 1;
    let retryCount = 0;
    
    const attemptSend = () => {
      sendMessage(message).catch(error => {
        console.error("Error in message sending:", error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying send (${retryCount}/${maxRetries})...`);
          // Wait a short time before retrying
          setTimeout(attemptSend, 1000);
        }
      });
    };
    
    attemptSend();
  };

  const handleLauncherClick = () => {
    if (user) {
      console.log("Opening chat dialog");
      setIsOpen(true);
    } else {
      console.log("User not logged in, showing toast");
      toast.info("Please sign in to chat with the AI assistant", {
        duration: 3000,
      });
    }
  };

  return (
    <>
      <ChatLauncher 
        onClick={handleLauncherClick} 
        isDisabled={!user}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className={cn(
            "max-h-[90vh] p-0 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300 z-50",
            isWide ? "sm:max-w-[800px]" : "sm:max-w-[400px] md:sm:max-w-[540px]"
          )}
          closeButton={false}
        >
          <ChatHeader 
            isWide={isWide}
            onToggleWidth={toggleWidth}
            onClearChat={clearMessages}
            onClose={() => setIsOpen(false)}
          />

          <div className="flex flex-col h-[calc(90vh-8rem)]">
            <ChatMessages 
              messages={messages} 
              isLoading={isLoading} 
              conversationContext={conversationContext}
            />
            <ChatInput 
              onSubmit={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
