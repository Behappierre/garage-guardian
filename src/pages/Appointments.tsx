
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppointments } from "@/hooks/use-appointments";
import type { AppointmentWithRelations } from "@/types/appointment";

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarViewType, setCalendarViewType] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("timeGridWeek");

  const { data: appointments, isLoading } = useAppointments();

  // Parse URL parameters on component mount and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    const viewParam = params.get('view') as "dayGridMonth" | "timeGridWeek" | "timeGridDay" | null;
    
    if (dateParam) {
      setSelectedDate(new Date(dateParam));
    }
    
    if (viewParam) {
      setCalendarViewType(viewParam);
    }
    
    // Always show calendar when date is specified
    if (dateParam) {
      setViewMode("calendar");
    }
  }, [location.search]);

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
                <button 
                  className={`flex items-center px-3 py-1.5 gap-1.5 rounded ${viewMode === "calendar" ? "bg-white shadow-sm" : "text-gray-600"}`}
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Calendar</span>
                </button>
                <button 
                  className={`flex items-center px-3 py-1.5 gap-1.5 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "text-gray-600"}`}
                  onClick={() => setViewMode("list")}
                >
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
          {viewMode === "calendar" ? (
            <AppointmentCalendar
              appointments={appointments || []}
              onDateSelect={handleDateSelect}
              onEventClick={handleEventClick}
              initialDate={selectedDate}
              initialView={calendarViewType}
            />
          ) : (
            <AppointmentList 
              appointments={appointments || []}
              onSelectAppointment={(appointment) => {
                setSelectedAppointment(appointment);
                setShowAppointmentForm(true);
              }}
              onTicketClick={handleTicketClick}
              isLoading={isLoading}
            />
          )}
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
