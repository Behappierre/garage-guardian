
import { Button } from "@/components/ui/button";

interface ChatLauncherProps {
  onClick: () => void;
}

export function ChatLauncher({ onClick }: ChatLauncherProps) {
  return (
    <Button
      size="icon"
      className="fixed bottom-4 right-4 h-28 w-28 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95 bg-transparent hover:bg-gray-100/10 overflow-hidden"
      onClick={onClick}
    >
      <div className="relative h-28 w-28">
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
            className="w-12 h-12 text-white"
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
    </Button>
  );
}
