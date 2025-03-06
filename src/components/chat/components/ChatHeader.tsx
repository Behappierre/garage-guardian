
import { X, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ChatHeaderProps {
  isWide: boolean;
  onToggleWidth: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

export function ChatHeader({ isWide, onToggleWidth, onClearChat, onClose }: ChatHeaderProps) {
  const handleClearChat = () => {
    onClearChat();
    toast.success("Chat cleared");
  };

  return (
    <DialogHeader className="flex flex-row items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 bg-purple-500/50 animate-pulse rounded-full blur-xl"></div>
          <div className="absolute inset-0 bg-blue-500/30 animate-pulse rounded-full blur-lg"></div>
          <div className="absolute inset-0 bg-teal-500/20 animate-pulse rounded-full blur-md"></div>
          <img 
            src="/lovable-uploads/cbfe65d7-b425-4f87-975a-f3f52a813a44.png" 
            alt="AI Wizard" 
            className="h-full w-full rounded-full object-cover relative z-10"
          />
        </div>
        <DialogTitle className="text-xl">AI Assistant</DialogTitle>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onToggleWidth}
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
          onClick={onClose}
          className="h-8 w-8"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </DialogHeader>
  );
}
