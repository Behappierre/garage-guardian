
import { Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="mt-auto p-4 border-t border-sidebar-border">
      <div className="space-y-1">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center py-2 px-3 text-sm rounded-md group w-full relative",
              isActive
                ? "bg-secondary/50 text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/30",
              isCollapsed ? "justify-center" : ""
            )
          }
          title="Settings"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md" />
              )}
              <span className={cn("shrink-0 w-5 h-5", isCollapsed ? "mr-0" : "mr-3")}>
                <Settings className="h-5 w-5" />
              </span>
              {!isCollapsed && <span>Settings</span>}
            </>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center py-2 px-3 text-sm rounded-md group w-full relative",
            "text-muted-foreground hover:bg-secondary/30",
            isCollapsed ? "justify-center" : ""
          )}
          title="Logout"
        >
          <span className={cn("shrink-0 w-5 h-5", isCollapsed ? "mr-0" : "mr-3")}>
            <LogOut className="h-5 w-5" />
          </span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};
