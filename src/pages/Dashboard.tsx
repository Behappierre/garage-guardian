
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const isDashboardRoot = location.pathname === "/dashboard";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onCollapse={setIsCollapsed} />
      <main className={cn(
        "flex-1 transition-all duration-300",
        isCollapsed ? "ml-16" : "ml-64"
      )}>
        <div className="h-full w-full px-6 py-8">
          {isDashboardRoot ? (
            <div className="mx-auto w-full max-w-[1400px]">
              <WelcomeHeader />
              <DashboardMetrics />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 bg-gradient-to-br from-white to-gray-50 shadow-sm">
                  <CardContent className="p-0">
                    <RecentActivity />
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="text-sm font-medium text-gray-800">Create New Appointment</h3>
                        <p className="text-xs text-gray-500 mt-1">Schedule a new client appointment</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="text-sm font-medium text-gray-800">Create Job Ticket</h3>
                        <p className="text-xs text-gray-500 mt-1">Start a new repair job</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="text-sm font-medium text-gray-800">Add New Client</h3>
                        <p className="text-xs text-gray-500 mt-1">Register a new customer</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
