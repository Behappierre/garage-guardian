
import { Button } from "@/components/ui/button";

interface ChatLauncherProps {
  onClick: () => void;
}

export function ChatLauncher({ onClick }: ChatLauncherProps) {
  return (
    <Button
      size="icon"
      className="fixed bottom-4 right-4 h-28 w-28 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95 bg-transparent hover:bg-gray-100/10"
      onClick={onClick}
    >
      <div className="relative h-28 w-28">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-500 blur-md animate-pulse" />
        <img 
          src="/lovable-uploads/1a78f9aa-9b33-4d28-9492-058c2342c6d5.png" 
          alt="AI Wizard" 
          className="h-full w-full object-contain relative z-10 rounded-full"
        />
      </div>
    </Button>
  );
}
