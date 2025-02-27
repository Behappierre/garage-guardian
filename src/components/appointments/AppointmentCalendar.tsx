
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

  // Update the calendar when initialDate or initialView changes
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
    
    updateAppointmentMutation.mutate({
      id: appointment.id,
      start_time: event.startStr,
      end_time: event.endStr,
    });
  };

  const handleEventResize = (eventResizeInfo: EventResizeDoneArg) => {
    const { event } = eventResizeInfo;
    const appointment = event.extendedProps as AppointmentWithBay;
    
    updateAppointmentMutation.mutate({
      id: appointment.id,
      start_time: event.startStr,
      end_time: event.endStr,
    });
  };

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

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.extendedProps as AppointmentWithBay);
  };

  // Calendar navigation functions
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
    }
  };

  // Update calendar title when view changes
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      setCalendarTitle(calendarApi.view.title);
    }
  }, [currentView]);

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
            /* Calendar base styling */
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
            
            /* Make all borders lighter */
            .fc th, .fc td {
              border-color: #edf2f7 !important;
            }
            
            /* Header row styling */
            .fc .fc-col-header {
              background-color: #ffffff;
            }
            
            .fc .fc-col-header-cell {
              padding: 0;
              height: auto;
              text-align: center; 
              vertical-align: top;
              border-width: 0 0 1px 0 !important;
              border-color: #edf2f7 !important;
            }
            
            /* Hide the default header content */
            .fc .fc-col-header-cell-cushion {
              display: none;
            }
            
            /* Time slots - REDUCE HEIGHT */
            .fc .fc-timegrid-slot {
              height: 1.5em !important;
              border-bottom: 1px solid #f1f5f9;
            }
            
            /* Time axis labels */
            .fc .fc-timegrid-axis {
              padding: 0.1rem 0.5rem;
              width: 30px !important;
            }
            
            .fc .fc-timegrid-axis-cushion {
              font-size: 0.75rem;
              font-weight: 500;
              color: #64748b;
            }
            
            /* Events styling */
            .fc-event {
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
            
            /* Remove the default toolbar */
            .fc-header-toolbar {
              display: none !important;
            }

            /* Hide scrollbars but allow scrolling */
            .fc-scroller {
              scrollbar-width: none;
              -ms-overflow-style: none;
              overflow-y: auto;
            }

            .fc-scroller::-webkit-scrollbar {
              display: none;
            }
            
            /* Custom styling for day headers */
            .fc-day-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid #edf2f7;
            }
            
            .fc-day-header .day-name {
              font-size: 0.75rem;
              font-weight: 500;
              color: #64748b;
              text-transform: capitalize;
              margin-bottom: 2px;
            }
            
            .fc-day-header .day-number {
              font-size: 1.125rem;
              font-weight: 600;
              color: #1f2937;
            }
            
            /* Current day highlight */
            .fc-day-header.current-day .day-name {
              color: #3b82f6;
            }
            
            .fc-day-header.current-day .day-number {
              color: #3b82f6;
            }
            
            /* Remove divider */
            .fc-timegrid-divider {
              display: none !important;
            }
            
            /* Adjust timegrid slots for better visibility */
            .fc-timegrid-slot-label-cushion {
              font-weight: 500;
              font-size: 0.75rem;
              color: #64748b;
            }
            
            /* Timegrid cols */
            .fc-timegrid-col-frame {
              background-color: #ffffff;
            }
            
            /* Custom day headers */
            .custom-day-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid #edf2f7;
            }
            
            /* Hide any headers in week view */
            .fc-timegrid-col-header-cushion {
              display: none;
            }
            
            /* Format column headers to show only DD.MM */
            .fc-col-header a {
              visibility: hidden;
            }

            /* Calendar title styling to match day/date headers */
            .fc-toolbar-title {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 1.125rem;
              font-weight: 600;
              color: #1f2937;
              letter-spacing: -0.01em;
            }
            
            /* Fix for grid cells */
            .fc-scrollgrid {
              width: 100% !important; 
            }
            
            /* Ensure all tables inside the calendar have full width */
            .fc-scrollgrid table,
            .fc-scrollgrid-sync-table,
            .fc-col-header, 
            .fc-timegrid-body,
            .fc-timegrid-cols,
            .fc-daygrid-body,
            .fc-daygrid-body table {
              width: 100% !important;
            }
            
            /* Fix the cell widths */
            .fc-col-header-cell,
            .fc-timegrid-col,
            .fc-daygrid-day {
              width: 14.285% !important; /* For 7 days of the week */
            }
            
            /* Ensure proper width for the time axis column */
            .fc .fc-timegrid-axis-frame {
              min-width: 50px !important;
            }
            
            /* Prevent horizontal scrolling on the entire calendar */
            .fc-view-harness {
              width: 100% !important;
              overflow-x: hidden !important;
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
          select={onDateSelect}
          eventClick={handleEventClick}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          editable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          dayHeaderFormat={{ weekday: 'short' }}
          datesSet={(dateInfo) => {
            setCalendarTitle(dateInfo.view.title);
          }}
          viewDidMount={(view) => {
            // This function creates our custom header display
            setTimeout(() => {
              // Get all column header cells
              const headerCells = document.querySelectorAll('.fc-col-header-cell');
              const today = new Date();
              const currentDayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
              
              headerCells.forEach(cell => {
                const date = cell.getAttribute('data-date');
                if (date) {
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  // Format as DD.MM 
                  const formattedDate = dateObj.getDate().toString().padStart(2, '0') + '.' + 
                                      (dateObj.getMonth() + 1).toString().padStart(2, '0');
                  
                  // Check if this is the current day
                  const isCurrentDay = date === currentDayStr;
                  
                  // Hide any existing content
                  const headerContent = cell.querySelector('.fc-col-header-cell-cushion');
                  if (headerContent instanceof HTMLElement) {
                    headerContent.style.display = 'none';
                  }
                  
                  // Remove any existing custom display
                  const existingDisplay = cell.querySelector('.custom-day-header');
                  if (existingDisplay) {
                    cell.removeChild(existingDisplay);
                  }
                  
                  // Create custom display
                  const customDisplay = document.createElement('div');
                  customDisplay.className = `custom-day-header ${isCurrentDay ? 'current-day' : ''}`;
                  
                  customDisplay.innerHTML = `
                    <div class="day-name" style="color: ${isCurrentDay ? '#3b82f6' : '#6B7280'}; text-align: center;">${dayName}</div>
                    <div class="day-number" style="color: ${isCurrentDay ? '#3b82f6' : '#111827'}; text-align: center;">${formattedDate}</div>
                  `;
                  
                  cell.appendChild(customDisplay);
                }
              });
              
              // Fix any duplicate elements in the time grid
              const timeGridHeaders = document.querySelectorAll('.fc-timegrid-col-header');
              timeGridHeaders.forEach(header => {
                // Add specific styling to these headers
                header.classList.add('bg-white', 'border-b', 'border-gray-100');
                
                // Hide any default content
                const cushion = header.querySelector('.fc-timegrid-col-header-cushion');
                if (cushion instanceof HTMLElement) {
                  cushion.style.display = 'none';
                }
              });
              
              // Ensure the scrolling area shows all time slots from 8am-5pm
              const scrollContainer = document.querySelector('.fc-scroller-liquid-absolute');
              if (scrollContainer instanceof HTMLElement) {
                scrollContainer.scrollTop = 0;
              }
            }, 100);
          }}
        />
      </div>
    </div>
  );
};
