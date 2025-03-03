import { NavLink } from "react-router-dom";
import { Settings, LogOut, ArrowLeftCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGarage } from "@/contexts/GarageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export const SidebarFooter = ({ isCollapsed }: SidebarFooterProps) => {
  const { currentGarage } = useGarage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleGarageExit = () => {
    // Clear only the current garage selection, but keep user logged in
    localStorage.removeItem("currentGarageId");
    toast.success("Exited garage. Redirecting to garage selection...");
    navigate("/auth");
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
            onClick={handleGarageExit}
            title="Exit Garage"
          >
            <ArrowLeftCircle className="shrink-0 w-5 h-5" />
            {!isCollapsed && <span>Exit Garage</span>}
          </Button>
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
