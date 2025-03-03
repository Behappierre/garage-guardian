
import { NavLink } from "react-router-dom";
import { Settings, LogOut, ArrowLeftCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGarage } from "@/contexts/GarageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getSubdomainInfo } from "@/utils/subdomain";

interface SidebarFooterProps {
  isCollapsed: boolean;
  userRole?: string;
  garageRole?: string;
}

export const SidebarFooter = ({ isCollapsed, userRole, garageRole }: SidebarFooterProps) => {
  const { currentGarage } = useGarage();
  const navigate = useNavigate();

  // Check if we're on a subdomain
  const { isSubdomain, hostname, isLocalhost } = getSubdomainInfo();
  
  // Generate main domain URL
  const getMainDomain = () => {
    const hostParts = hostname.split('.');
    return isLocalhost 
      ? 'localhost:8080' // For local development
      : hostParts.length > 2 ? hostParts.slice(1).join('.') : hostname;
  };
  
  const mainDomain = getMainDomain();

  // LOGOUT: Redirects to the same garage subdomain login page
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    
    // Stay on the same subdomain (same garage) for a new user to log in
    navigate("/auth");
  };

  // EXIT GARAGE: Takes user to the create garage page and logs them out completely
  const handleGarageExit = async () => {
    // First sign out the user
    await supabase.auth.signOut();
    
    // Clear any garage selection data
    localStorage.removeItem("currentGarageId");
    
    // Redirect to create-garage page on main domain
    const protocol = window.location.protocol;
    toast.success("Exited garage. Redirecting to create garage page...");
    window.location.href = `${protocol}//${mainDomain}/create-garage`;
  };

  // MANAGE GARAGES: Takes garage owner to My Garages page to manage their garages
  const handleManageGarages = () => {
    const protocol = window.location.protocol;
    
    // Open in same window, go to my-garages on main domain
    window.location.href = `${protocol}//${mainDomain}/my-garages`;
  };

  // Check if user is allowed to exit garage or manage garages (admin or owner)
  const canExitGarage = userRole === 'administrator' || garageRole === 'owner' || garageRole === 'admin';

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
            
            {/* Show Manage Garages for owners and admins */}
            <li>
              <Button
                variant="ghost"
                className={cn(
                  "w-full flex items-center justify-start gap-2 px-4 py-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-md",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={handleManageGarages}
                title="Manage Garages"
              >
                <ExternalLink className="shrink-0 w-5 h-5" />
                {!isCollapsed && <span>Manage Garages</span>}
              </Button>
            </li>
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
