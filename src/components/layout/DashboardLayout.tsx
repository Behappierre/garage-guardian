
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto p-8 transition-all duration-300 ${isCollapsed ? "ml-16" : "ml-64"}`}>
        <Outlet />
      </main>
    </div>
  );
}
