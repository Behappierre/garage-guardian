
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
      "p-4 border-t border-gray-200",
      isCollapsed && "flex flex-col items-center"
    )}>
      <ul className="space-y-1 w-full">
        <li>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                isActive && "bg-primary/5 text-primary hover:bg-primary/5",
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
              "w-full flex items-center justify-start gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md",
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
