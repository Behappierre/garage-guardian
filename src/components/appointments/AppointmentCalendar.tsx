
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppointmentWithRelations } from "@/types/appointment";

type BayType = 'all' | 'bay1' | 'bay2' | 'mot';

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
  const [selectedBay, setSelectedBay] = useState<BayType>('all');

  const getEventTitle = (appointment: AppointmentWithRelations) => {
    const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;
    const vehicle = appointment.vehicle || appointment.job_tickets?.[0]?.vehicle;
    
    if (vehicle) {
      return `${clientName} - ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''} - ${appointment.service_type}`;
    }
    
    return `${clientName} - ${appointment.service_type}`;
  };

  const filterAppointmentsByBay = (appointments: AppointmentWithRelations[]) => {
    if (selectedBay === 'all') return appointments;
    return appointments.filter(appointment => appointment.bay === selectedBay);
  };

  const calendarEvents = filterAppointmentsByBay(appointments)
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
    <div className="space-y-4">
      <div className="flex justify-end">
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
    </div>
  );
};
