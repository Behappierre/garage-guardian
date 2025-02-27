
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

const Dashboard = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showJobTicketForm, setShowJobTicketForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardRoot = location.pathname === "/dashboard";

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onCollapse={setIsCollapsed} />
      <main className={cn(
        "flex-1 transition-all duration-300 w-full",
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
                      <div 
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start"
                        onClick={() => setShowAppointmentForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-800">Create New Appointment</h3>
                          <p className="text-xs text-gray-500 mt-1">Schedule a new client appointment</p>
                        </div>
                        <CalendarPlus className="text-primary h-5 w-5 mt-1" />
                      </div>
                      
                      <div 
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start"
                        onClick={() => setShowJobTicketForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-800">Create Job Ticket</h3>
                          <p className="text-xs text-gray-500 mt-1">Start a new repair job</p>
                        </div>
                        <Wrench className="text-primary h-5 w-5 mt-1" />
                      </div>
                      
                      <div 
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-start"
                        onClick={() => setShowClientForm(true)}
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-800">Add New Client</h3>
                          <p className="text-xs text-gray-500 mt-1">Register a new customer</p>
                        </div>
                        <UserPlus className="text-primary h-5 w-5 mt-1" />
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
