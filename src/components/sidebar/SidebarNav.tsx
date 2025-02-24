
import { NavLink } from "react-router-dom";
import {
  Calendar,
  Users,
  LayoutDashboard,
  Wrench,
  UserCog,
  Hammer,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  isCollapsed: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
}

export const SidebarNav = ({ isCollapsed, isAdmin, isTechnician }: SidebarNavProps) => {
  return (
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
        <li>
          <NavLink
            to="/dashboard/help"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100",
                isActive && "bg-primary/5 text-primary hover:bg-primary/5",
                isCollapsed && "justify-center px-2"
              )
            }
            title="Help"
          >
            <HelpCircle className="shrink-0 w-5 h-5" />
            {!isCollapsed && <span>Help</span>}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};
