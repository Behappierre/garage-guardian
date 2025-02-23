
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import type { AppointmentWithRelations } from "@/types/appointment";

interface AppointmentCalendarProps {
  appointments: AppointmentWithRelations[];
  onDateSelect: (arg: { start: Date; end: Date }) => void;
  onEventClick: (appointment: AppointmentWithRelations) => void;
}

export const AppointmentCalendar = ({
  appointments,
  onDateSelect,
  onEventClick,
}: AppointmentCalendarProps) => {
  const getEventTitle = (appointment: AppointmentWithRelations) => {
    const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;
    const vehicle = appointment.vehicle || appointment.job_tickets?.[0]?.vehicle;
    
    if (vehicle) {
      return `${clientName} - ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''} - ${appointment.service_type}`;
    }
    
    return `${clientName} - ${appointment.service_type}`;
  };

  const calendarEvents = appointments
    ?.filter(appointment => appointment.status !== 'cancelled')
    .map(appointment => ({
      id: appointment.id,
      title: getEventTitle(appointment),
      start: appointment.start_time,
      end: appointment.end_time,
      extendedProps: appointment,
    })) || [];

  const handleEventClick = (clickInfo: EventClickArg) => {
    onEventClick(clickInfo.event.extendedProps as AppointmentWithRelations);
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
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
      />
    </div>
  );
};
