
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export const Sidebar = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: isAdmin } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data?.role === "administrator";
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center gap-2 px-4 py-4 border-b border-gray-200",
          isCollapsed ? "justify-center" : "px-6"
        )}>
          <img 
            src="/lovable-uploads/ba509b59-4243-41c9-9fe3-392cd0b2b2a7.png" 
            alt="Garage Whizz Logo" 
            className="h-8 w-auto"
          />
          {!isCollapsed && <span className="font-semibold text-xl">Whizz</span>}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-16 bg-white border shadow-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
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
                    isCollapsed && "justify-center"
                  )
                }
                title="Dashboard"
              >
                <LayoutDashboard className="w-5 h-5" />
                {!isCollapsed && "Dashboard"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/appointments"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center"
                  )
                }
                title="Appointments"
              >
                <Calendar className="w-5 h-5" />
                {!isCollapsed && "Appointments"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/clients"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center"
                  )
                }
                title="Clients"
              >
                <Users className="w-5 h-5" />
                {!isCollapsed && "Clients"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/job-tickets"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center"
                  )
                }
                title="Job Tickets"
              >
                <Wrench className="w-5 h-5" />
                {!isCollapsed && "Job Tickets"}
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
                      isCollapsed && "justify-center"
                    )
                  }
                  title="Admin"
                >
                  <UserCog className="w-5 h-5" />
                  {!isCollapsed && "Admin"}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className={cn(
          "p-4 border-t border-gray-200",
          isCollapsed && "flex flex-col items-center"
        )}>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                    isCollapsed && "justify-center"
                  )
                }
                title="Settings"
              >
                <Settings className="w-5 h-5" />
                {!isCollapsed && "Settings"}
              </NavLink>
            </li>
            <li>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={handleSignOut}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                {!isCollapsed && "Logout"}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
