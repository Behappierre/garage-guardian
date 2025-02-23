
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 ml-64">
        <Outlet />
      </main>
    </div>
  );
}
