
import { NavLink } from "react-router-dom";
import {
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Tool,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Sidebar = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <img src="/placeholder.svg" alt="Logo" className="w-8 h-8" />
          <span className="font-semibold text-xl">AutoPro</span>
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
                <Tool className="w-5 h-5" />
                Job Tickets
              </NavLink>
            </li>
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
