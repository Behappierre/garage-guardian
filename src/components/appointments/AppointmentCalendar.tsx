
import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { EventResizeDoneArg } from "@fullcalendar/interaction";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useOpeningTimes, isWithinBusinessHours, timeToHour } from "@/hooks/use-opening-times";

type BayType = 'all' | 'bay1' | 'bay2' | 'mot';
type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface AppointmentWithBay extends AppointmentWithRelations {
  bay?: 'bay1' | 'bay2' | 'mot' | null;
}

interface AppointmentCalendarProps {
  appointments: AppointmentWithBay[];
  onDateSelect: (arg: { start: Date; end: Date }) => void;
  onEventClick: (appointment: AppointmentWithBay) => void;
  initialDate?: Date | null;
  initialView?: CalendarViewType;
}

export const AppointmentCalendar = ({
  appointments,
  onDateSelect,
  onEventClick,
  initialDate = null,
  initialView = 'timeGridWeek'
}: AppointmentCalendarProps) => {
  const [selectedBay, setSelectedBay] = useState<BayType>('all');
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView);
  const [calendarTitle, setCalendarTitle] = useState('');
  const calendarRef = useRef<FullCalendar | null>(null);
  const queryClient = useQueryClient();
  
  const { data: openingTimes, isLoading: isLoadingOpeningTimes } = useOpeningTimes();

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      if (initialDate) {
        calendarApi.gotoDate(initialDate);
      }
      if (initialView) {
        calendarApi.changeView(initialView);
        setCurrentView(initialView);
      }
      setCalendarTitle(calendarApi.view.title);
    }
  }, [initialDate, initialView]);

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, start_time, end_time }: { id: string, start_time: string, end_time: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ start_time, end_time })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    },
  });

  const getEventTitle = (appointment: AppointmentWithBay) => {
    const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;
    const vehicle = appointment.vehicle || appointment.job_tickets?.[0]?.vehicle;
    
    if (vehicle) {
      return `${clientName} - ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''} - ${appointment.service_type}`;
    }
    
    return `${clientName} - ${appointment.service_type}`;
  };

  const getBayColor = (bay: BayType | null | undefined) => {
    switch (bay) {
      case 'bay1':
        return '#F97316'; // Bright Orange
      case 'bay2':
        return '#0EA5E9'; // Ocean Blue
      case 'mot':
        return '#8B5CF6'; // Vivid Purple
      default:
        return '#64748B'; // Default gray
    }
  };

  const filterAppointmentsByBay = (appointments: AppointmentWithBay[]) => {
    if (selectedBay === 'all') return appointments;
    return appointments.filter(appointment => appointment.bay === selectedBay);
  };

  const handleEventDrop = (eventDropInfo: EventDropArg) => {
    const { event } = eventDropInfo;
    const appointment = event.extendedProps as AppointmentWithBay;
    
    if (openingTimes && openingTimes.length > 0) {
      const newStartDate = new Date(event.startStr);
      const newEndDate = new Date(event.endStr);
      
      if (!isWithinBusinessHours(newStartDate, openingTimes) || 
          !isWithinBusinessHours(newEndDate, openingTimes)) {
        toast.error("Cannot schedule appointments outside business hours");
        eventDropInfo.revert();
        return;
      }
    }
    
    updateAppointmentMutation.mutate({
      id: appointment.id,
      start_time: event.startStr,
      end_time: event.endStr,
    });
  };

  const handleEventResize = (eventResizeInfo: EventResizeDoneArg) => {
    const { event } = eventResizeInfo;
    const appointment = event.extendedProps as AppointmentWithBay;
    
    if (openingTimes && openingTimes.length > 0) {
      const newEndDate = new Date(event.endStr);
      
      if (!isWithinBusinessHours(newEndDate, openingTimes)) {
        toast.error("Cannot schedule appointments outside business hours");
        eventResizeInfo.revert();
        return;
      }
    }
    
    updateAppointmentMutation.mutate({
      id: appointment.id,
      start_time: event.startStr,
      end_time: event.endStr,
    });
  };

  const handleDateSelect = (arg: { start: Date; end: Date }) => {
    if (openingTimes && openingTimes.length > 0) {
      if (!isWithinBusinessHours(arg.start, openingTimes) || 
          !isWithinBusinessHours(arg.end, openingTimes)) {
        toast.error("Cannot schedule appointments outside business hours");
        return;
      }
    }
    
    onDateSelect(arg);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.extendedProps as AppointmentWithBay);
  };

  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      setCalendarTitle(calendarApi.view.title);
    }
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      setCalendarTitle(calendarApi.view.title);
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      setCalendarTitle(calendarApi.view.title);
    }
  };

  const handleViewChange = (view: CalendarViewType) => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setCalendarTitle(calendarApi.view.title);
      
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setCalendarTitle(calendarApi.view.title);
    }
  }, [currentView]);

  const businessHoursConfig = openingTimes?.map((day) => {
    if (day.is_closed) return null;
    
    const [startHours, startMinutes] = day.start_time.split(':').map(Number);
    const [endHours, endMinutes] = day.end_time.split(':').map(Number);
    
    return {
      daysOfWeek: [day.day_of_week],
      startTime: `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
      endTime: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
    };
  }).filter(Boolean);

  const calendarEvents = filterAppointmentsByBay(appointments)
    ?.filter(appointment => appointment.status !== 'cancelled')
    .map(appointment => ({
      id: appointment.id,
      title: getEventTitle(appointment),
      start: appointment.start_time,
      end: appointment.end_time,
      backgroundColor: getBayColor(appointment.bay),
      borderColor: getBayColor(appointment.bay),
      textColor: '#FFFFFF',
      extendedProps: appointment,
      editable: true,
      durationEditable: true,
    })) || [];

  return (
    <div className="space-y-2 w-full">
      <div className="fc-toolbar-container flex items-center justify-between mb-4">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            className="rounded-l-md rounded-r-none"
            onClick={handlePrev}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-l-none rounded-r-md"
            onClick={handleNext}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2"
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
        <h2 className="fc-toolbar-title text-xl font-medium text-[#111827]">{calendarTitle}</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedBay} onValueChange={(value: BayType) => setSelectedBay(value)}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Select bay" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bays</SelectItem>
              <SelectItem value="bay1">Bay 1</SelectItem>
              <SelectItem value="bay2">Bay 2</SelectItem>
              <SelectItem value="mot">MOT</SelectItem>
            </SelectContent>
          </Select>
          <div className="fc-view-buttons flex items-center space-x-0">
            <Button
              variant={currentView === 'dayGridMonth' ? 'default' : 'outline'}
              size="sm"
              className="rounded-l-md rounded-r-none"
              onClick={() => handleViewChange('dayGridMonth')}
            >
              Month
            </Button>
            <Button
              variant={currentView === 'timeGridWeek' ? 'default' : 'outline'}
              size="sm"
              className="rounded-none border-x-0"
              onClick={() => handleViewChange('timeGridWeek')}
            >
              Week
            </Button>
            <Button
              variant={currentView === 'timeGridDay' ? 'default' : 'outline'}
              size="sm"
              className="rounded-r-md rounded-l-none"
              onClick={() => handleViewChange('timeGridDay')}
            >
              Day
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 w-full">
        <style>
          {`
            .fc {
              --fc-border-color: #edf2f7;
              --fc-today-bg-color: #f7fafc;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              height: calc(100vh - 10rem) !important;
              min-height: 600px;
              max-height: 800px;
              background-color: white;
              width: 100% !important;
            }
            
            .fc th, .fc td {
              border-color: #edf2f7 !important;
            }
            
            .fc .fc-col-header {
              background-color: #ffffff;
            }
            
            .fc .fc-col-header-cell {
              padding: 8px 0;
              height: auto;
              text-align: center; 
              vertical-align: middle;
              border-width: 0 0 1px 0 !important;
              border-color: #edf2f7 !important;
            }
            
            .fc .fc-timegrid-slot {
              height: 1.5em !important;
              border-bottom: 1px solid #f1f5f9;
            }
            
            .fc .fc-timegrid-axis {
              padding: 0.1rem 0.5rem;
              width: 40px !important;
            }
            
            .fc .fc-timegrid-axis-cushion {
              font-size: 0.75rem;
              font-weight: 500;
              color: #64748b;
            }
            
            .fc .fc-event {
              border-radius: 4px;
              border: none !important;
              padding: 2px 4px;
              font-size: 0.75rem;
              line-height: 1.2;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            
            .fc-event-title {
              font-weight: 500;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            .fc-event-time {
              font-size: 0.7rem;
              font-weight: 600;
              display: block;
            }
            
            .fc-header-toolbar {
              display: none !important;
            }
            
            .fc-scroller {
              scrollbar-width: none;
              -ms-overflow-style: none;
              overflow-y: auto;
            }
            
            .fc-scroller::-webkit-scrollbar {
              display: none;
            }
            
            .fc-timegrid-day-frame, .fc-daygrid-day-frame {
              min-width: 100% !important;
            }
            
            .fc-scrollgrid {
              width: 100% !important; 
            }
            
            .fc-scrollgrid-section,
            .fc-scrollgrid table,
            .fc-scrollgrid-sync-table,
            .fc-col-header, 
            .fc-timegrid-body,
            .fc-timegrid-cols,
            .fc-daygrid-body,
            .fc-daygrid-body table {
              width: 100% !important;
            }
            
            .fc-col-header-cell,
            .fc-timegrid-col,
            .fc-daygrid-day {
              width: 14.285% !important;
            }
            
            .fc .fc-timegrid-axis-frame {
              min-width: 50px !important;
            }
            
            .fc-view-harness {
              width: 100% !important;
              overflow-x: hidden !important;
            }
            
            .fc-timeGridDay-view .fc-timegrid-col {
              width: 100% !important;
            }
            
            .fc-timeGridDay-view .fc-timegrid-cols,
            .fc-timeGridDay-view .fc-timegrid-col,
            .fc-timeGridDay-view .fc-scrollgrid-sync-table {
              width: 100% !important;
              min-width: 100% !important;
            }
            
            .fc-col-header-cell-cushion {
              display: inline-block !important;
              padding: 8px;
              font-weight: 500;
              color: #1f2937;
            }
            
            .fc-dayGridMonth-view .fc-col-header-cell-cushion {
              visibility: visible;
            }
            
            .fc-timeGridWeek-view .fc-day-today {
              background-color: rgba(14, 165, 233, 0.05) !important;
            }
            
            .fc-timeGridWeek-view .fc-day-today .fc-col-header-cell-cushion {
              color: #0EA5E9 !important;
              font-weight: 600;
            }
            
            .fc-timeGridDay-view .fc-col-header {
              display: none !important;
            }
            
            .fc-timeGridDay-view .fc-timegrid-axis,
            .fc-timeGridDay-view .fc-timegrid-slots,
            .fc-timeGridDay-view .fc-timegrid-slot,
            .fc-timeGridDay-view .fc-timegrid-slot-lane {
              width: 100% !important;
            }
            
            .fc-non-business {
              background: repeating-linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.03),
                rgba(0, 0, 0, 0.03) 10px,
                rgba(0, 0, 0, 0.05) 10px,
                rgba(0, 0, 0, 0.05) 20px
              ) !important;
            }
            
            /* Hide the small number at the top of the day cell in month view */
            .fc-daygrid-day-top {
              display: flex;
              justify-content: center;
              padding-top: 4px;
            }
            
            .fc-daygrid-day-number {
              font-size: 0.9rem;
              font-weight: 500;
              color: #374151;
            }
            
            /* This targets and hides the secondary number in month view */
            .fc-dayGridMonth-view .fc-daygrid-day-top .fc-daygrid-day-number:after {
              content: none !important;
            }
            
            /* Hide the unwanted date numbers that appear outside the current month */
            .fc-day-other .fc-daygrid-day-top:before {
              display: none !important;
            }
            
            /* Make sure only the current month's day numbers show properly */
            .fc-dayGridMonth-view .fc-daygrid-day:not(.fc-day-other) .fc-daygrid-day-number {
              display: inline-block;
            }
            
            /* Completely hide the secondary number that appears at the top left */
            .fc-dayGridMonth-view .fc-daygrid-day-top {
              position: relative;
            }
            
            .fc-dayGridMonth-view .fc-daygrid-day-top:before,
            .fc-dayGridMonth-view .fc-daygrid-day-top:after {
              display: none !important;
            }
            
            /* Show only the day name (Sun, Mon, etc.) in the month view header */
            .fc-dayGridMonth-view .fc-col-header-cell-cushion {
              text-transform: none;
              white-space: nowrap;
            }
            
            /* Hide the date part in the month view column header */
            .fc-dayGridMonth-view .fc-col-header-cell-cushion:after,
            .fc-dayGridMonth-view .fc-col-header-cell-cushion:before {
              content: none !important;
            }
            
            /* Apply a custom format that shows only day names */
            .fc-dayGridMonth-view .fc-col-header-cell {
              overflow: hidden;
            }
          `}
        </style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={initialView}
          initialDate={initialDate || undefined}
          headerToolbar={false}
          height="auto"
          events={calendarEvents}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          slotMinTime="07:30:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          editable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          dayHeaderFormat={{ weekday: 'short' }}
          businessHours={businessHoursConfig || true}
          selectConstraint="businessHours"
          eventConstraint="businessHours"
          datesSet={(dateInfo) => {
            setCalendarTitle(dateInfo.view.title);
            setCurrentView(dateInfo.view.type as CalendarViewType);
          }}
        />
      </div>
    </div>
  );
};
