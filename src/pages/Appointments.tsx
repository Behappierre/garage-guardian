import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DBAppointment = Database["public"]["Tables"]["appointments"]["Row"];
type DBClient = Database["public"]["Tables"]["clients"]["Row"];
type DBJobTicket = Database["public"]["Tables"]["job_tickets"]["Row"];

type Appointment = DBAppointment & {
  client: DBClient;
  job_ticket?: DBJobTicket;
};

const Appointments = () => {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          job_ticket:job_tickets(*)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
  });

  const handleDateSelect = (arg: { start: Date; end: Date }) => {
    setSelectedDate(arg.start);
    setShowAppointmentForm(true);
  };

  const handleEventClick = (arg: { event: { extendedProps: Appointment } }) => {
    setSelectedAppointment(arg.event.extendedProps);
    setShowAppointmentForm(true);
  };

  const calendarEvents = appointments?.map(appointment => ({
    id: appointment.id,
    title: `${appointment.client.first_name} ${appointment.client.last_name} - ${appointment.service_type}`,
    start: appointment.start_time,
    end: appointment.end_time,
    extendedProps: appointment,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
              <p className="text-gray-500">Manage service appointments and schedules</p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setSelectedAppointment(null);
                setSelectedDate(null);
                setShowAppointmentForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              New Appointment
            </Button>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="bg-white p-4 rounded-lg border">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              height="auto"
              events={calendarEvents}
              selectable={true}
              select={handleDateSelect}
              eventClick={(arg: any) => handleEventClick(arg)}
              slotMinTime="08:00:00"
              slotMaxTime="18:00:00"
              allDaySlot={false}
              slotDuration="00:30:00"
            />
          </TabsContent>

          <TabsContent value="list">
            <AppointmentList 
              appointments={appointments || []}
              onSelectAppointment={(appointment) => {
                setSelectedAppointment(appointment);
                setShowAppointmentForm(true);
              }}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>

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
