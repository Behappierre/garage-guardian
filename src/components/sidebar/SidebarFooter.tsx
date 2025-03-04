
import { NavLink } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className={cn(
      "p-4 border-t border-sidebar-border",
      isCollapsed && "flex flex-col items-center"
    )}>
      <ul className="space-y-1 w-full">
        <li>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-2"
              )
            }
            title="Settings"
          >
            <Settings className="shrink-0 w-5 h-5" />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </li>
        <li>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center justify-start gap-2 px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleSignOut}
            title="Logout"
          >
            <LogOut className="shrink-0 w-5 h-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </li>
      </ul>
    </div>
  );
};
