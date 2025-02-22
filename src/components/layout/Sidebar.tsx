
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Sidebar = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Appointments", icon: Calendar, path: "/dashboard/appointments" },
    { label: "Clients", icon: Users, path: "/dashboard/clients" },
    { label: "History", icon: History, path: "/dashboard/history" },
  ];

  return (
    <div className={`${collapsed ? "w-16" : "w-64"} h-screen bg-white border-r border-gray-200 fixed left-0 top-0 transition-all duration-300 ease-in-out`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <span className="text-xl font-semibold text-primary">GarageGuardian</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={`${collapsed ? "mx-auto" : ""}`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={`w-full justify-start ${collapsed ? "px-2" : "px-4"}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="h-5 w-5" />
            {!collapsed && <span className="ml-2">{item.label}</span>}
          </Button>
        ))}
      </nav>
    </div>
  );
};
