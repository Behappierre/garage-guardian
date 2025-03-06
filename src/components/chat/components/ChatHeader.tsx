
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
      <div className="flex items-center gap-2">
        <img 
          src="/lovable-uploads/1a78f9aa-9b33-4d28-9492-058c2342c6d5.png" 
          alt="AI Wizard" 
          className="h-10 w-10 rounded-full object-cover"
        />
        <DialogTitle className="text-lg">AI Assistant</DialogTitle>
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
