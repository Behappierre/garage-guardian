
import { ChevronLeft, ChevronRight, Home, Calendar, Users, FileText, Settings, Shield, ClipboardList, HelpCircle, LogOut } from "lucide-react";
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

  // Create navigation links based on user roles
  const navLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      matches: [] // Empty matches array so it only matches exactly /dashboard
    },
    {
      href: "/dashboard/appointments",
      label: "Appointments",
      icon: <Calendar className="h-5 w-5" />,
      matches: ["/dashboard/appointments"]
    },
    {
      href: "/dashboard/clients",
      label: "Clients",
      icon: <Users className="h-5 w-5" />,
      matches: ["/dashboard/clients"]
    },
    {
      href: "/dashboard/job-tickets",
      label: "Job Tickets",
      icon: <FileText className="h-5 w-5" />,
      matches: ["/dashboard/job-tickets"]
    }
  ];

  // Add admin-only links
  if (isAdmin) {
    navLinks.push({
      href: "/dashboard/admin",
      label: "Admin",
      icon: <Shield className="h-5 w-5" />,
      matches: ["/dashboard/admin"]
    });
  }

  // Add technician-specific links
  if (isTechnician) {
    navLinks.push({
      href: "/dashboard/my-work",
      label: "My Work",
      icon: <ClipboardList className="h-5 w-5" />,
      matches: ["/dashboard/my-work"]
    });
  }

  // Add help link for everyone
  navLinks.push({
    href: "/dashboard/help",
    label: "Help",
    icon: <HelpCircle className="h-5 w-5" />,
    matches: ["/dashboard/help"]
  });

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
          className="absolute -right-3 top-10 bg-background border shadow-sm z-20"
          onClick={() => onCollapse(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <SidebarNav 
          collapsed={isCollapsed} 
          links={navLinks}
        />
        
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
