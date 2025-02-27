
import { useState } from "react";
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

type BayType = 'all' | 'bay1' | 'bay2' | 'mot';

interface AppointmentWithBay extends AppointmentWithRelations {
  bay?: 'bay1' | 'bay2' | 'mot' | null;
}

interface AppointmentCalendarProps {
  appointments: AppointmentWithBay[];
  onDateSelect: (arg: { start: Date; end: Date }) => void;
  onEventClick: (appointment: AppointmentWithBay) => void;
}

export const AppointmentCalendar = ({
  appointments,
  onDateSelect,
  onEventClick,
}: AppointmentCalendarProps) => {
  const [selectedBay, setSelectedBay] = useState<BayType>('all');
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-2">
      <div className="flex justify-end items-center">
        <Select value={selectedBay} onValueChange={(value: BayType) => setSelectedBay(value)}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Select bay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bays</SelectItem>
            <SelectItem value="bay1">Bay 1</SelectItem>
            <SelectItem value="bay2">Bay 2</SelectItem>
            <SelectItem value="mot">MOT</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <style>
          {`
            /* Modern Calendar Styling */
            .fc {
              --fc-border-color: #edf2f7;
              --fc-today-bg-color: #f7fafc;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              height: calc(100vh - 12rem) !important;
              min-height: 600px;
            }
            
            /* Header with month/year display */
            .fc .fc-toolbar.fc-header-toolbar {
              margin-bottom: 0.5em;
              padding: 0.75rem 1rem;
              border-bottom: 1px solid var(--fc-border-color);
            }
            
            .fc .fc-toolbar-title {
              font-size: 1.25rem;
              font-weight: 700;
              color: #111827;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            /* Navigation buttons */
            .fc .fc-button-primary {
              background-color: #f8fafc;
              border-color: #e2e8f0;
              color: #1e293b;
              font-weight: 500;
              text-transform: capitalize;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
              padding: 0.25rem 0.75rem;
              font-size: 0.875rem;
              border-radius: 0.375rem;
            }
            
            .fc .fc-button-primary:not(:disabled):hover {
              background-color: #f1f5f9;
              border-color: #cbd5e1;
              color: #0f172a;
            }
            
            .fc .fc-button-primary:not(:disabled).fc-button-active,
            .fc .fc-button-primary:not(:disabled):active {
              background-color: #2dd4bf;
              border-color: #2dd4bf;
              color: #ffffff;
            }
            
            .fc .fc-button-primary:focus {
              box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2dd4bf;
            }
            
            /* Modern day header style with date and day */
            .fc .fc-col-header-cell {
              padding: 0.5rem 0;
              background-color: #ffffff;
              border-bottom: 1px solid #edf2f7;
              height: 60px;
            }
            
            /* Hide the default header content */
            .fc .fc-col-header-cell-cushion {
              display: none;
            }
            
            /* Custom styling for the day headers */
            .fc-theme-standard thead tr th {
              position: relative;
            }
            
            /* Style for the date part */
            .fc-theme-standard td:first-child, 
            .fc-theme-standard th:first-child {
              border-left: 0;
            }
            
            .fc-theme-standard td:last-child, 
            .fc-theme-standard th:last-child {
              border-right: 0;
            }
            
            /* Current day - highlight with modern style */
            .fc .fc-day-today {
              background-color: #f8fafc !important;
            }
            
            /* Week view specifics */
            .fc .fc-timegrid-slot {
              height: 2.5em !important;
              border-bottom: 1px solid #f1f5f9;
            }
            
            .fc .fc-timegrid-axis {
              padding: 0.25rem;
            }
            
            .fc .fc-timegrid-axis-cushion {
              font-size: 0.75rem;
              font-weight: 500;
              color: #64748b;
            }
            
            /* Events styling */
            .fc-event {
              border-radius: 4px;
              border: none;
              padding: 2px 4px;
              font-size: 0.75rem;
              font-weight: 500;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            .fc-daygrid-event {
              padding: 3px 6px;
              margin-bottom: 2px;
            }
            
            /* Time grid adjustments */
            .fc-timegrid-event {
              border-radius: 4px;
              padding: 2px 4px;
            }
            
            .fc-timegrid-event .fc-event-main {
              padding: 1px 2px;
            }
            
            .fc-timegrid-event .fc-event-title {
              font-size: 0.75rem;
              line-height: 1.2;
            }
            
            /* Hover state for events */
            .fc-event:hover {
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              opacity: 0.95;
            }
            
            /* More link styling */
            .fc .fc-more-link {
              font-size: 0.75rem;
              color: #2dd4bf;
              font-weight: 600;
            }
            
            /* Selected day highlight */
            .fc .fc-day-other .fc-daygrid-day-top {
              opacity: 0.7;
            }
            
            /* Week/day view time slots */
            .fc .fc-timegrid-slot-minor {
              border-top-style: dotted;
            }
            
            /* Custom column header styling to hide YYYY-MM-DD format */
            .fc-col-header-cell-cushion {
              visibility: hidden !important;
            }
            
            /* Remove YYYY-MM-DD date headers in week view */
            .fc-timegrid-axis-frame, .fc-timegrid-col-frame {
              background-color: transparent !important;
            }
            
            /* Hide default column headers in timegrid */
            .fc-timegrid-col-frame .fc-timegrid-col-header {
              visibility: visible;
            }
            
            /* Format column headers to show only DD.MM */
            .fc-col-header a {
              visibility: hidden;
            }
            
            /* Custom header cell styling */
            .custom-date-display {
              padding: 0.25rem 0;
              text-align: center;
            }
            
            /* Highlight current day */
            .custom-date-display.current-day .day-name {
              color: #3b82f6 !important;
            }
            
            .custom-date-display.current-day .date-number {
              color: #3b82f6 !important;
              font-weight: 700 !important;
            }
            
            /* Compact the toolbar */
            .fc-header-toolbar.fc-toolbar {
              display: flex;
              flex-wrap: wrap;
              gap: 0.5rem;
              justify-content: space-between;
              align-items: center;
            }
            
            .fc-header-toolbar.fc-toolbar .fc-toolbar-chunk {
              display: flex;
              align-items: center;
              gap: 0.25rem;
            }

            /* Make the day slots fit more content */
            .fc-timegrid-slots table {
              height: auto !important;
            }
            
            .fc-timegrid-divider {
              display: none !important;
            }
            
            /* More compact toolbar on mobile */
            @media (max-width: 640px) {
              .fc .fc-toolbar-title {
                font-size: 1rem;
              }
              
              .fc .fc-button-primary {
                padding: 0.2rem 0.4rem;
                font-size: 0.75rem;
              }
              
              .fc .fc-timegrid-slot {
                height: 2em !important;
              }
            }
          `}
        </style>
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
          select={onDateSelect}
          eventClick={handleEventClick}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          editable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          dayHeaderFormat={{ day: '2-digit', month: '2-digit', omitCommas: true, separator: '.' }}
          viewDidMount={(view) => {
            // This function fixes header display for any view
            setTimeout(() => {
              // Get all column header cells
              const headerCells = document.querySelectorAll('.fc-col-header-cell');
              const today = new Date();
              const currentDayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
              
              headerCells.forEach(cell => {
                const date = cell.getAttribute('data-date');
                if (date) {
                  const dateObj = new Date(date);
                  const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  // Format as DD.MM without year
                  const formattedDate = dateObj.getDate().toString().padStart(2, '0') + '.' + 
                                      (dateObj.getMonth() + 1).toString().padStart(2, '0');
                  
                  // Check if this is the current day
                  const isCurrentDay = date === currentDayStr;
                  
                  // Hide any existing content
                  const headerContent = cell.querySelector('.fc-col-header-cell-cushion');
                  if (headerContent instanceof HTMLElement) {
                    headerContent.style.visibility = 'hidden';
                  }
                  
                  // Remove any existing custom display
                  const existingDisplay = cell.querySelector('.custom-date-display');
                  if (existingDisplay) {
                    cell.removeChild(existingDisplay);
                  }
                  
                  // Create custom display
                  const customDisplay = document.createElement('div');
                  customDisplay.className = `custom-date-display ${isCurrentDay ? 'current-day' : ''}`;
                  
                  customDisplay.innerHTML = `
                    <div>
                      <div class="day-name" style="font-size: 0.75rem; font-weight: 500; color: ${isCurrentDay ? '#3b82f6' : '#94a3b8'};">${day}</div>
                      <div class="date-number" style="font-size: 1rem; font-weight: 600; color: ${isCurrentDay ? '#3b82f6' : '#000'};">${formattedDate}</div>
                    </div>
                  `;
                  
                  cell.appendChild(customDisplay);
                }
              });
              
              // Fix the duplicate date issue in week view
              if (view.view.type === 'timeGridWeek') {
                const dateHeaders = document.querySelectorAll('.fc-timegrid-col-header-cushion');
                dateHeaders.forEach(header => {
                  if (header instanceof HTMLElement) {
                    // Hide the default headers completely
                    header.style.display = 'none';
                  }
                });
              }
            }, 100); // Small delay to ensure DOM is fully rendered
          }}
        />
      </div>
    </div>
  );
};
