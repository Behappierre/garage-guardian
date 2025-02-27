
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { useNavigate } from "react-router-dom";
import { useAppointments } from "@/hooks/use-appointments";
import type { AppointmentWithRelations } from "@/types/appointment";

const Appointments = () => {
  const navigate = useNavigate();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: appointments, isLoading } = useAppointments();

  const handleDateSelect = (arg: { start: Date; end: Date }) => {
    setSelectedDate(arg.start);
    setShowAppointmentForm(true);
  };

  const handleEventClick = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment);
    setShowAppointmentForm(true);
  };

  const handleTicketClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/job-tickets?id=${ticketId}`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-600 mt-1">Manage service appointments and schedules</p>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="bg-gray-100 rounded-md p-0.5 flex">
                <button className="flex items-center px-3 py-1.5 gap-1.5 rounded bg-white shadow-sm">
                  <CalendarIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Calendar</span>
                </button>
                <button className="flex items-center px-3 py-1.5 gap-1.5 rounded text-gray-600">
                  <List className="h-4 w-4" />
                  <span className="text-sm">List</span>
                </button>
              </div>
              
              <div className="ml-6 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                  <span className="text-xs text-gray-600">Bay 1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  <span className="text-xs text-gray-600">Bay 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                  <span className="text-xs text-gray-600">MOT</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-[120px]">
                <select className="appearance-none block w-full bg-white border border-gray-200 rounded px-3 py-2 pr-8 text-sm focus:outline-none">
                  <option>All Bays</option>
                  <option>Bay 1</option>
                  <option>Bay 2</option>
                  <option>MOT</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  setSelectedAppointment(null);
                  setSelectedDate(null);
                  setShowAppointmentForm(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white rounded-md p-2 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>New Appointment</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <TabsContent value="calendar" className="m-0 p-0">
            <AppointmentCalendar
              appointments={appointments || []}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
            />
          </TabsContent>

          <TabsContent value="list" className="m-0 p-0">
            <AppointmentList 
              appointments={appointments || []}
              onSelectAppointment={(appointment) => {
                setSelectedAppointment(appointment);
                setShowAppointmentForm(true);
              }}
              onTicketClick={handleTicketClick}
              isLoading={isLoading}
            />
          </TabsContent>
        </div>

        <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedAppointment ? "Edit Appointment" : "Create New Appointment"}
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm
              initialData={selectedAppointment}
              selectedDate={selectedDate}
              onClose={() => {
                setShowAppointmentForm(false);
                setSelectedAppointment(null);
                setSelectedDate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Appointments;
