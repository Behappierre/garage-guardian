
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List, Filter } from "lucide-react";
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
        {/* Redesigned header section */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
              <p className="text-gray-500 mt-1">Manage service appointments and schedules</p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setSelectedAppointment(null);
                setSelectedDate(null);
                setShowAppointmentForm(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-medium gap-2 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              New Appointment
            </Button>
          </div>

          <Tabs defaultValue="calendar" className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <TabsList className="bg-secondary/50 p-1 rounded-md">
                <TabsTrigger value="calendar" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="list" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                    <span className="text-gray-600">Bay 1</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                    <span className="text-gray-600">Bay 2</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                    <span className="text-gray-600">MOT</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="ml-2 gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </div>
            </div>

            <TabsContent value="calendar" className="mt-2 p-0">
              <AppointmentCalendar
                appointments={appointments || []}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-2 p-0">
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
