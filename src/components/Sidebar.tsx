
import { NavLink } from "react-router-dom";
import {
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Wrench,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const Sidebar = ({ isCollapsed, onCollapse }: SidebarProps) => {
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-10",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center gap-2 border-b border-gray-200",
          isCollapsed ? "justify-center p-4" : "px-6 py-4"
        )}>
          {settings?.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Garage Logo" 
              className="h-8 w-auto"
            />
          ) : (
            <img 
              src="/lovable-uploads/ba509b59-4243-41c9-9fe3-392cd0b2b2a7.png" 
              alt="Garage Whizz Logo" 
              className="h-8 w-auto"
            />
          )}
          {!isCollapsed && <span className="font-semibold text-xl">Whizz</span>}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-16 bg-white border shadow-sm z-20"
          onClick={() => onCollapse(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center px-2"
                  )
                }
                title="Dashboard"
              >
                <LayoutDashboard className="shrink-0 w-5 h-5" />
                {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
            </li>
            {isTechnician && (
              <li>
                <NavLink
                  to="/dashboard/my-work"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                      isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                      isCollapsed && "justify-center px-2"
                    )
                  }
                  title="My Work"
                >
                  <Hammer className="shrink-0 w-5 h-5" />
                  {!isCollapsed && <span>My Work</span>}
                </NavLink>
              </li>
            )}
            <li>
              <NavLink
                to="/dashboard/appointments"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center px-2"
                  )
                }
                title="Appointments"
              >
                <Calendar className="shrink-0 w-5 h-5" />
                {!isCollapsed && <span>Appointments</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/clients"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center px-2"
                  )
                }
                title="Clients"
              >
                <Users className="shrink-0 w-5 h-5" />
                {!isCollapsed && <span>Clients</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/job-tickets"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center px-2"
                  )
                }
                title="Job Tickets"
              >
                <Wrench className="shrink-0 w-5 h-5" />
                {!isCollapsed && <span>Job Tickets</span>}
              </NavLink>
            </li>
            {isAdmin && (
              <li>
                <NavLink
                  to="/dashboard/admin"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                      isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                      isCollapsed && "justify-center px-2"
                    )
                  }
                  title="Admin"
                >
                  <UserCog className="shrink-0 w-5 h-5" />
                  {!isCollapsed && <span>Admin</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

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
                  "w-full flex items-center gap-2 px-4 py-2",
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
      </div>
    </div>
  );
};
