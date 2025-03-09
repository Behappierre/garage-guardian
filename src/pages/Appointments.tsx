import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAppointments } from "@/hooks/use-appointments";
import type { AppointmentWithRelations } from "@/types/appointment";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/AuthProvider";

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarViewType, setCalendarViewType] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("timeGridWeek");
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { garageId } = useAuth();

  const { 
    data: appointments, 
    isLoading, 
    error,
    nameFilter,
    setNameFilter,
    registrationFilter,
    setRegistrationFilter,
    statusFilter,
    setStatusFilter,
    bayFilter,
    setBayFilter,
    dateRangeType,
    startDate,
    endDate,
    setDateRange,
    sortField,
    sortOrder,
    toggleSort,
    resetAllFilters
  } = useAppointments();

  useEffect(() => {
    console.log("Appointments loaded:", appointments?.length);
    console.log("Loading state:", isLoading);
    console.log("Error state:", error);
    console.log("Garage ID:", garageId);
    
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view') as "dayGridMonth" | "timeGridWeek" | "timeGridDay" | null;
    
    if (dateParam) {
      setSelectedDate(new Date(dateParam));
    }
    
    if (viewParam) {
      setCalendarViewType(viewParam);
    }
    
    if (dateParam) {
      setViewMode("calendar");
    }
  }, [searchParams, appointments, isLoading, error, garageId]);

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

  const handleDateRangeChange = (range: { from: Date, to: Date } | undefined) => {
    if (range?.from) {
      const customStart = range.from;
      const customEnd = range.to || range.from;
      setDateRange("custom", customStart, customEnd);
    } else {
      setDateRange("all");
    }
  };

  const handleViewModeChange = (mode: "calendar" | "list") => {
    setViewMode(mode);
    
    if (mode === "list" && dateRangeType === "all") {
    }
  };

  const handleSortFieldToggle = (field: AppointmentSortField) => {
    console.log(`Toggling sort on field: ${field}, current field: ${sortField}, current order: ${sortOrder}`);
    toggleSort(field);
  };

  if (error) {
    console.error("Error loading appointments:", error);
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-2">Error Loading Appointments</h2>
        <p className="text-red-500">There was a problem loading the appointments. Please try refreshing the page.</p>
        <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-auto max-w-full">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="Appointments"
        description="Manage service appointments and schedules"
        className={isDarkMode ? "bg-black" : ""}
      >
        <PageActionButton
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setSelectedAppointment(null);
            setSelectedDate(null);
            setShowAppointmentForm(true);
          }}
        >
          New Appointment
        </PageActionButton>
      </PageHeader>

      <div className="px-8 pb-8 w-full">
        <div className="mb-6 sticky top-0 z-20 bg-background">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center">
              <div className={`rounded-md p-0.5 flex ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                <button 
                  className={`flex items-center px-3 py-1.5 gap-1.5 rounded ${
                    viewMode === "calendar" 
                      ? isDarkMode 
                        ? "bg-gray-700 shadow-sm" 
                        : "bg-white shadow-sm" 
                      : isDarkMode 
                        ? "text-gray-300" 
                        : "text-gray-600"
                  }`}
                  onClick={() => handleViewModeChange("calendar")}
                >
                  <CalendarIcon className={`h-4 w-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`} />
                  <span className="text-sm">Calendar</span>
                </button>
                <button 
                  className={`flex items-center px-3 py-1.5 gap-1.5 rounded ${
                    viewMode === "list" 
                      ? isDarkMode 
                        ? "bg-gray-700 shadow-sm" 
                        : "bg-white shadow-sm" 
                      : isDarkMode 
                        ? "text-gray-300" 
                        : "text-gray-600"
                  }`}
                  onClick={() => handleViewModeChange("list")}
                >
                  <List className="h-4 w-4" />
                  <span className="text-sm">List</span>
                </button>
              </div>
              
              <div className="ml-6 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                  <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Bay 1</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Bay 2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                  <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>MOT</span>
                </div>
              </div>
            </div>
          </div>
          
          {viewMode === "list" && (
            <AppointmentFilters
              nameFilter={nameFilter}
              registrationFilter={registrationFilter}
              statusFilter={statusFilter}
              bayFilter={bayFilter}
              dateRangeType={dateRangeType}
              dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined}
              sortField={sortField}
              sortOrder={sortOrder}
              onNameFilterChange={setNameFilter}
              onRegistrationFilterChange={setRegistrationFilter}
              onStatusFilterChange={setStatusFilter}
              onBayFilterChange={setBayFilter}
              onDateRangeChange={handleDateRangeChange}
              onDateRangeTypeChange={setDateRange}
              onSortChange={handleSortFieldToggle}
              onResetFilters={resetAllFilters}
            />
          )}
        </div>

        <div className={`rounded-lg shadow-sm w-full ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
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
              nameFilter={nameFilter}
              registrationFilter={registrationFilter}
              statusFilter={statusFilter}
              bayFilter={bayFilter}
              startDate={startDate}
              endDate={endDate}
              sortField={sortField}
              sortOrder={sortOrder}
            />
          )}
        </div>
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
    </div>
  );
};

export default Appointments;

