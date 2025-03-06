
import { Button } from "@/components/ui/button";

interface ChatLauncherProps {
  onClick: () => void;
}

export function ChatLauncher({ onClick }: ChatLauncherProps) {
  return (
    <Button
      size="icon"
      className="fixed bottom-4 right-4 h-32 w-32 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95 p-0 overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-purple-500/50 animate-pulse rounded-full blur-xl"></div>
      <div className="absolute inset-0 bg-blue-500/30 animate-pulse rounded-full blur-lg"></div>
      <img 
        src="/lovable-uploads/1a78f9aa-9b33-4d28-9492-058c2342c6d5.png" 
        alt="AI Wizard" 
        className="h-full w-full object-cover relative z-10"
      />
    </Button>
  );
}
