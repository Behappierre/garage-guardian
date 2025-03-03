
import { NavLink } from "react-router-dom";
import { Settings, LogOut, ArrowLeftCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGarage } from "@/contexts/GarageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SidebarFooterProps {
  isCollapsed: boolean;
  userRole?: string;
  garageRole?: string;
}

export const SidebarFooter = ({ isCollapsed, userRole, garageRole }: SidebarFooterProps) => {
  const { currentGarage } = useGarage();
  const navigate = useNavigate();

  // Check if we're on a subdomain
  const isSubdomain = window.location.hostname.split('.').length > 2;
  const mainDomain = window.location.hostname.split('.').slice(-2).join('.');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleGarageExit = () => {
    // Clear only the current garage selection, but keep user logged in
    localStorage.removeItem("currentGarageId");
    
    // If on a subdomain, redirect to main domain
    if (isSubdomain) {
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${mainDomain}`;
    } else {
      toast.success("Exited garage. Redirecting to garage selection...");
      navigate("/auth");
    }
  };

  // Check if user is allowed to exit garage (admin or owner)
  const canExitGarage = userRole === 'administrator' || garageRole === 'owner' || garageRole === 'admin';
  
  // Generate the garage selector URL (main domain if on subdomain)
  const getGarageSelectorUrl = () => {
    if (isSubdomain) {
      const protocol = window.location.protocol;
      return `${protocol}//${mainDomain}/auth`;
    }
    return "/auth";
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
        
        {/* For admins and owners, show garage management options */}
        {canExitGarage && (
          <>
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
            
            {isSubdomain && (
              <li>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full flex items-center justify-start gap-2 px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={() => window.open(getGarageSelectorUrl(), '_blank')}
                  title="Manage Garages"
                >
                  <ExternalLink className="shrink-0 w-5 h-5" />
                  {!isCollapsed && <span>Manage Garages</span>}
                </Button>
              </li>
            )}
          </>
        )}
        
        {/* Always show logout */}
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
      
      {currentGarage && !isCollapsed && (
        <div className="mt-4 pt-4 border-t border-sidebar-border">
          <p className="text-xs text-gray-500">
            {isSubdomain ? 
              `Connected to ${currentGarage.name}` : 
              `Current garage: ${currentGarage.name}`}
          </p>
        </div>
      )}
    </div>
  );
};
