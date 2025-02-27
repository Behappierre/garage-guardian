
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
        {/* More compact header section */}
        <div className="bg-white rounded-lg shadow-sm mb-2 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Appointments</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage service appointments and schedules</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedAppointment(null);
                setSelectedDate(null);
                setShowAppointmentForm(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium gap-1.5 whitespace-nowrap h-9"
            >
              <Plus className="h-4 w-4" />
              New Appointment
            </Button>
          </div>

          <Tabs defaultValue="calendar" className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <TabsList className="bg-secondary/50 p-0.5 rounded-md h-8">
                <TabsTrigger value="calendar" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5 h-7">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5 h-7">
                  <List className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
                  <span className="text-gray-600">Bay 1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600">Bay 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>
                  <span className="text-gray-600">MOT</span>
                </div>
              </div>
            </div>

            <TabsContent value="calendar" className="mt-1 p-0">
              <AppointmentCalendar
                appointments={appointments || []}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-1 p-0">
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
          </Tabs>
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
