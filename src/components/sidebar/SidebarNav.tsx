
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
    if (location.pathname === href) return true;
    if (matches) {
      return matches.some(match => location.pathname.startsWith(match));
    }
    return false;
  };

  return (
    <nav className="space-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          onClick={onNavigation}
          className={cn(
            "flex items-center py-2 px-3 text-sm rounded-md group w-full",
            isActive(link.href, link.matches)
              ? "bg-secondary/50 text-secondary-foreground font-medium"
              : "text-muted-foreground hover:bg-secondary/30",
            collapsed ? "justify-center" : ""
          )}
        >
          <span className={cn("mr-3", collapsed ? "mr-0" : "")}>{link.icon}</span>
          {!collapsed && <span>{link.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
