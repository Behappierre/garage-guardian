
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
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Select value={selectedBay} onValueChange={(value: BayType) => setSelectedBay(value)}>
          <SelectTrigger className="w-[180px]">
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
      
      <div className="bg-white p-4 rounded-lg border">
        <style>
          {`
            .fc .fc-toolbar.fc-header-toolbar {
              margin-bottom: 1em;
            }
            .fc .fc-button-primary {
              background-color: #f3f4f6;
              border-color: #e5e7eb;
              color: #374151;
              font-weight: 500;
              text-transform: capitalize;
              padding: 0.375rem 0.75rem;
              font-size: 0.875rem;
            }
            .fc .fc-button-primary:not(:disabled):hover {
              background-color: #e5e7eb;
              border-color: #d1d5db;
              color: #1f2937;
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
            .fc .fc-toolbar-title {
              font-size: 1.25rem;
              font-weight: 600;
              color: #111827;
            }
            .fc .fc-button {
              padding: 0.375rem 0.75rem;
              border-radius: 0.375rem;
              font-size: 0.875rem;
              line-height: 1.25rem;
              transition: all 150ms ease-in-out;
            }
            .fc .fc-toolbar {
              display: flex;
              align-items: center;
              gap: 1rem;
            }
            .fc .fc-toolbar-chunk {
              display: flex;
              align-items: center;
              gap: 0.5rem;
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
        />
      </div>
    </div>
  );
};
