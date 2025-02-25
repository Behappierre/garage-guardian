
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ExternalLink } from "lucide-react";

interface AppointmentListProps {
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (appointment: AppointmentWithRelations) => void;
  onTicketClick: (ticketId: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}

export const AppointmentList = ({
  appointments,
  onSelectAppointment,
  onTicketClick,
  isLoading
}: AppointmentListProps) => {
  if (isLoading) {
    return <div>Loading appointments...</div>;
  }

  return (
    <div className="space-y-4">
      {appointments?.map((appointment) => {
        if (!appointment.client) return null; // Skip rendering if client data is missing
        
        return (
          <div
            key={appointment.id}
            onClick={() => onSelectAppointment(appointment)}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium">
                    {appointment.client?.first_name} {appointment.client?.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">{appointment.service_type}</p>
                </div>
                
                {appointment.job_tickets?.[0]?.vehicle && (
                  <p className="text-sm text-gray-600">
                    Vehicle: {appointment.job_tickets[0].vehicle.year} {appointment.job_tickets[0].vehicle.make} {appointment.job_tickets[0].vehicle.model}
                    {appointment.job_tickets[0].vehicle.license_plate && (
                      <span className="ml-1">({appointment.job_tickets[0].vehicle.license_plate})</span>
                    )}
                  </p>
                )}

                <div className="text-sm text-gray-500">
                  <div>Start: {format(new Date(appointment.start_time), "MMM d, yyyy h:mm a")}</div>
                  <div>End: {format(new Date(appointment.end_time), "MMM d, yyyy h:mm a")}</div>
                </div>
                
                {appointment.notes && (
                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                )}

                {appointment.job_tickets && appointment.job_tickets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {appointment.job_tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={(e) => onTicketClick(ticket.id, e)}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        {ticket.ticket_number}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'}`}
              >
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
