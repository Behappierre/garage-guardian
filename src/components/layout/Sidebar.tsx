
import { NavLink } from "react-router-dom";
import {
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Wrench,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Sidebar = () => {
  const { user } = useAuth();

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
    <div className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <img 
            src="/lovable-uploads/ba509b59-4243-41c9-9fe3-392cd0b2b2a7.png" 
            alt="Garage Whizz Logo" 
            className="h-8 w-auto"
          />
          <span className="font-semibold text-xl">Whizz</span>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                  )
                }
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/appointments"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                  )
                }
              >
                <Calendar className="w-5 h-5" />
                Appointments
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/clients"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                  )
                }
              >
                <Users className="w-5 h-5" />
                Clients
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/job-tickets"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                  )
                }
              >
                <Wrench className="w-5 h-5" />
                Job Tickets
              </NavLink>
            </li>
            {isAdmin && (
              <li>
                <NavLink
                  to="/dashboard/admin"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                      isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                    )
                  }
                >
                  <UserCog className="w-5 h-5" />
                  Admin
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                    isActive && "bg-primary/5 text-primary hover:bg-primary/5"
                  )
                }
              >
                <Settings className="w-5 h-5" />
                Settings
              </NavLink>
            </li>
            <li>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
