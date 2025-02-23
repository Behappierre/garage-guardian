
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/types/appointment";

interface AppointmentItemProps {
  appointment: AppointmentWithRelations;
}

export const AppointmentItem = ({ appointment }: AppointmentItemProps) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{appointment.service_type}</h4>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Start: {format(new Date(appointment.start_time), "MMM d, yyyy h:mm a")}</p>
            <p>End: {format(new Date(appointment.end_time), "MMM d, yyyy h:mm a")}</p>
            {appointment.job_tickets?.[0]?.vehicle && (
              <p className="text-sm text-gray-600">
                Vehicle: {appointment.job_tickets[0].vehicle.year} {appointment.job_tickets[0].vehicle.make} {appointment.job_tickets[0].vehicle.model}
                {appointment.job_tickets[0].vehicle.license_plate && (
                  <span className="ml-1">({appointment.job_tickets[0].vehicle.license_plate})</span>
                )}
              </p>
            )}
            {appointment.notes && <p className="text-gray-600">{appointment.notes}</p>}
          </div>
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
};
