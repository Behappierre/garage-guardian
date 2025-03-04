
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SidebarLogo } from "./sidebar/SidebarLogo";
import { SidebarNav } from "./sidebar/SidebarNav";
import { SidebarFooter } from "./sidebar/SidebarFooter";

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const Sidebar = ({ isCollapsed, onCollapse }: SidebarProps) => {
  const { user } = useAuth();

  const { data: userRoles } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user,
  });

  const isAdmin = userRoles?.includes("administrator");
  const isTechnician = userRoles?.includes("technician");

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300 z-10",
        "dark:bg-sidebar-background dark:border-sidebar-border",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <SidebarLogo isCollapsed={isCollapsed} />

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-16 bg-background border shadow-sm z-20"
          onClick={() => onCollapse(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <SidebarNav 
          isCollapsed={isCollapsed} 
          isAdmin={isAdmin} 
          isTechnician={isTechnician} 
        />
        
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>
    </div>
  );
};
