
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  links: {
    href: string;
    label: string;
    icon: React.ReactNode;
    matches?: string[];
  }[];
  collapsed?: boolean;
  onNavigation?: () => void;
}

export function SidebarNav({ links, collapsed = false, onNavigation }: SidebarNavProps) {
  const location = useLocation();

  const isActive = (href: string, matches?: string[]) => {
    // Exact match for dashboard to prevent it from matching all /dashboard routes
    if (href === "/dashboard" && location.pathname !== "/dashboard") {
      return false;
    }
    
    // Exact match
    if (location.pathname === href) return true;
    
    // Match patterns from the matches array
    if (matches) {
      return matches.some(match => location.pathname.startsWith(match));
    }
    
    return false;
  };

  return (
    <nav className="space-y-1 mt-8">
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          onClick={onNavigation}
          className={cn(
            "flex items-center py-2 px-3 text-sm rounded-md group w-full relative",
            isActive(link.href, link.matches)
              ? "bg-secondary/50 text-secondary-foreground font-medium" 
              : "text-muted-foreground hover:bg-secondary/30",
            collapsed ? "justify-center" : ""
          )}
        >
          {isActive(link.href, link.matches) && (
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
          )}
          <span className={cn("shrink-0 w-5 h-5", collapsed ? "mr-0" : "mr-3")}>{link.icon}</span>
          {!collapsed && <span>{link.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
