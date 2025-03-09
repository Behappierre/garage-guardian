
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
  }, [isOpen]);

  const toggleWidth = () => {
    setIsWide(prev => !prev);
  };

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  const handleLauncherClick = () => {
    if (user) {
      setIsOpen(true);
    } else {
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
            "max-h-[90vh] p-0 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300",
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
