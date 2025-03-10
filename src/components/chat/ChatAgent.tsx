
import { useState, useEffect } from "react";
import { ChatMessages } from "./components/ChatMessages";
import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatLauncher } from "./components/ChatLauncher";
import { useChatOptimized } from "./hooks/useChatOptimized";
import { useAuth } from "@/components/auth/AuthProvider";

export function ChatAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const { user } = useAuth();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages, 
    initializeChat,
    conversationContext 
  } = useChatOptimized();

  // Initialize chat when component mounts or user logs in
  useEffect(() => {
    if (user && isOpen) {
      initializeChat();
    }
  }, [user, isOpen, initializeChat]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const toggleWidth = () => {
    setIsWide(!isWide);
  };

  // Show the chat UI only when logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <div className={`fixed bottom-4 right-4 ${isWide ? 'w-[600px]' : 'w-80 md:w-96'} h-[600px] max-h-[80vh] bg-background shadow-xl rounded-lg border overflow-hidden flex flex-col z-50`}>
          <ChatHeader 
            isWide={isWide} 
            onToggleWidth={toggleWidth} 
            onClearChat={clearMessages} 
            onClose={() => setIsOpen(false)} 
          />
          <ChatMessages 
            messages={messages} 
            isLoading={isLoading} 
            conversationContext={conversationContext}
          />
          <ChatInput 
            onSubmit={sendMessage} 
            isLoading={isLoading} 
          />
        </div>
      ) : (
        <ChatLauncher onClick={toggleChat} />
      )}
    </>
  );
}
