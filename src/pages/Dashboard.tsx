
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const isDashboardRoot = location.pathname === "/dashboard";

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={isCollapsed} onCollapse={setIsCollapsed} />
      <main className={cn(
        "flex-1 transition-all duration-300",
        isCollapsed ? "ml-16" : "ml-64"
      )}>
        <div className="container mx-auto p-6">
          {isDashboardRoot ? (
            <>
              <WelcomeHeader />
              <DashboardMetrics />
              <RecentActivity />
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
