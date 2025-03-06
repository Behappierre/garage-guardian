
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LockIcon } from "lucide-react";

interface ChatLauncherProps {
  onClick: () => void;
  isDisabled?: boolean;
}

export function ChatLauncher({ onClick, isDisabled = false }: ChatLauncherProps) {
  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 h-32 w-32 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95 p-0 overflow-hidden",
        isDisabled && "opacity-80 cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-purple-500/50 animate-pulse rounded-full blur-xl"></div>
      <div className="absolute inset-0 bg-blue-500/30 animate-pulse rounded-full blur-lg"></div>
      <img 
        src="/lovable-uploads/cbfe65d7-b425-4f87-975a-f3f52a813a44.png" 
        alt="AI Wizard" 
        className="h-full w-full object-cover relative z-10"
      />
      
      {isDisabled && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
          <LockIcon className="text-white h-10 w-10" />
        </div>
      )}
    </Button>
  );
}
