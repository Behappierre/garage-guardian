
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus, Wrench, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import { ClientForm } from "@/components/forms/ClientForm";
import { useTheme } from "next-themes";

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showJobTicketForm, setShowJobTicketForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardRoot = location.pathname === "/dashboard";
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`flex min-h-screen bg-background`}>
      <Sidebar isCollapsed={isCollapsed} onCollapse={setIsCollapsed} />
      <main className={cn(
        "flex-1 transition-all duration-300 w-full",
        isCollapsed ? "ml-16" : "ml-64"
      )}>
        {isDashboardRoot ? (
          <div className="h-full w-full">
            <div className="p-8">
              <WelcomeHeader />
              <DashboardMetrics />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className={`lg:col-span-2 shadow-sm ${
                  isDarkMode 
                    ? "bg-gradient-to-br from-gray-900 to-black" 
                    : "bg-gradient-to-br from-white to-gray-50"
                }`}>
                  <CardContent className="p-0">
                    <RecentActivity />
                  </CardContent>
                </Card>
                
                <Card className={`shadow-sm overflow-hidden ${
                  isDarkMode 
                    ? "bg-gradient-to-br from-gray-900 to-black" 
                    : "bg-gradient-to-br from-blue-50 to-indigo-50"
                }`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-4 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}>Quick Actions</h2>
                    <div className="space-y-3">
                      <div 
                        className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start ${
                          isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => setShowAppointmentForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}>Create New Appointment</h3>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500" 
                          }`}>Schedule a new client appointment</p>
                        </div>
                        <CalendarPlus className="text-primary h-5 w-5 mt-1" />
                      </div>
                      
                      <div 
                        className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start ${
                          isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => setShowJobTicketForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}>Create Job Ticket</h3>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500" 
                          }`}>Start a new repair job</p>
                        </div>
                        <Wrench className="text-primary h-5 w-5 mt-1" />
                      </div>
                      
                      <div 
                        className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start ${
                          isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => setShowClientForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}>Add New Client</h3>
                          <p className={`text-xs mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500" 
                          }`}>Register a new customer</p>
                        </div>
                        <UserPlus className="text-primary h-5 w-5 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <Outlet />
          </div>
        )}
      </main>

      {/* Appointment Form Dialog */}
      <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initialData={null}
            selectedDate={null}
            onClose={() => setShowAppointmentForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Job Ticket Form Dialog */}
      <Dialog open={showJobTicketForm} onOpenChange={setShowJobTicketForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Job Ticket</DialogTitle>
          </DialogHeader>
          <JobTicketForm
            onClose={() => setShowJobTicketForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Client Form Dialog */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            onClose={() => setShowClientForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
