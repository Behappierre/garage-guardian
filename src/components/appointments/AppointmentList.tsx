
import { format } from "date-fns";
import { AppointmentWithRelations } from "@/pages/Appointments";

interface AppointmentListProps {
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (appointment: AppointmentWithRelations) => void;
  isLoading: boolean;
}

export const AppointmentList = ({ appointments, onSelectAppointment, isLoading }: AppointmentListProps) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading appointments...</div>;
  }

  if (!appointments.length) {
    return <div className="text-center py-4">No appointments found</div>;
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          onClick={() => onSelectAppointment(appointment)}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">
                {appointment.client.first_name} {appointment.client.last_name}
              </h3>
              <p className="text-sm text-gray-600">{appointment.service_type}</p>
              {appointment.job_ticket && (
                <p className="text-sm text-gray-500">
                  Ticket: {appointment.job_ticket.ticket_number}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {format(new Date(appointment.start_time), "MMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-500">
                {format(new Date(appointment.start_time), "h:mm a")} - 
                {format(new Date(appointment.end_time), "h:mm a")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
