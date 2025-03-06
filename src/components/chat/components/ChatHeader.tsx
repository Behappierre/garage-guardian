
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
        <div className="relative h-14 w-14">
          {/* Background glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-500 blur-md animate-pulse"></div>
          
          {/* Video background */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <video 
              className="h-full w-full object-cover scale-150 opacity-70"
              autoPlay 
              muted 
              loop 
              playsInline
            >
              <source src="https://cdn.pixabay.com/vimeo/328218825/particles-24916.mp4?width=640&hash=0d1faef41b17bc06f36cdfce7c87dd3f2f79bbc1" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          {/* AI icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-6 h-6 text-white"
            >
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          </div>
        </div>
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
