
import { Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // Changed from potentially navigating elsewhere to "/" home page
  };

  return (
    <div className="mt-auto p-4 border-t border-sidebar-border">
      <ul className="space-y-1">
        <li>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-primary border-l-4 border-primary font-medium" : "",
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
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent w-full text-left transition-colors",
              isCollapsed && "justify-center px-2"
            )}
            title="Logout"
          >
            <LogOut className="shrink-0 w-5 h-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </li>
      </ul>
    </div>
  );
};
