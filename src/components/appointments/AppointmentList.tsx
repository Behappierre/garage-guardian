
import { format } from "date-fns";
import { isWithinInterval } from "date-fns";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AppointmentSortField, SortOrder } from "@/hooks/appointments/use-appointment-filters";

interface AppointmentListProps {
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (appointment: AppointmentWithRelations) => void;
  onTicketClick: (ticketId: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  nameFilter: string;
  registrationFilter: string;
  statusFilter: string | "all";
  bayFilter: string | "all";
  startDate: Date | null;
  endDate: Date | null;
  sortField: AppointmentSortField;
  sortOrder: SortOrder;
}

export const AppointmentList = ({
  appointments,
  onSelectAppointment,
  onTicketClick,
  isLoading,
  nameFilter,
  registrationFilter,
  statusFilter,
  bayFilter,
  startDate,
  endDate,
  sortField,
  sortOrder
}: AppointmentListProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-6 text-center">Loading appointments...</div>;
  }

  if (!appointments || appointments.length === 0) {
    return <div className="p-6 text-center">No appointments found</div>;
  }

  // Filter appointments
  let filteredAppointments = appointments.filter(appointment => {
    // Filter by client name
    const clientName = `${appointment.client?.first_name || ''} ${appointment.client?.last_name || ''}`.toLowerCase();
    const matchesName = nameFilter ? clientName.includes(nameFilter.toLowerCase()) : true;
    
    // Filter by vehicle registration
    const registration = appointment.vehicle?.license_plate?.toLowerCase() || '';
    const matchesRegistration = registrationFilter ? registration.includes(registrationFilter.toLowerCase()) : true;
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    
    // Filter by bay
    const matchesBay = bayFilter === "all" || appointment.bay === bayFilter;
    
    // Filter by date range
    let matchesDateRange = true;
    if (startDate && endDate && appointment.start_time) {
      const appointmentDate = new Date(appointment.start_time);
      matchesDateRange = isWithinInterval(appointmentDate, { start: startDate, end: endDate });
    }
    
    return matchesName && matchesRegistration && matchesStatus && matchesBay && matchesDateRange;
  });
  
  // Sort appointments
  filteredAppointments.sort((a, b) => {
    if (sortField === "client_name") {
      const aName = `${a.client?.first_name || ''} ${a.client?.last_name || ''}`.toLowerCase();
      const bName = `${b.client?.first_name || ''} ${b.client?.last_name || ''}`.toLowerCase();
      return sortOrder === "asc" 
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    } else {
      const aDate = new Date(a.start_time).getTime();
      const bDate = new Date(b.start_time).getTime();
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }
  });

  const handleTicketClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to the job tickets page with the ticket ID
    navigate(`/dashboard/job-tickets?id=${ticketId}`);
  };

  return (
    <div className="space-y-4">
      {filteredAppointments.map((appointment) => {
        // Skip rendering if appointment data is missing
        if (!appointment || !appointment.id) return null;
        
        return (
          <div
            key={appointment.id}
            onClick={() => onSelectAppointment(appointment)}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium">
                    {appointment.client?.first_name || ''} {appointment.client?.last_name || ''}
                    {!(appointment.client?.first_name || appointment.client?.last_name) && 'No Client Name'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.service_type || 'No Service Type'}</p>
                </div>
                
                {appointment.vehicle && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Vehicle: {appointment.vehicle.make || ''} {appointment.vehicle.model || ''}
                    {appointment.vehicle.license_plate && (
                      <span className="ml-1">({appointment.vehicle.license_plate})</span>
                    )}
                  </p>
                )}

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {appointment.start_time && (
                    <div>Start: {format(new Date(appointment.start_time), "MMM d, yyyy h:mm a")}</div>
                  )}
                  {appointment.end_time && (
                    <div>End: {format(new Date(appointment.end_time), "MMM d, yyyy h:mm a")}</div>
                  )}
                </div>
                
                {appointment.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{appointment.notes}</p>
                )}

                {appointment.job_tickets && appointment.job_tickets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {appointment.job_tickets.map((ticket) => (
                      ticket && ticket.id ? (
                        <button
                          key={ticket.id}
                          onClick={(e) => handleTicketClick(ticket.id, e)}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                          {ticket.ticket_number || 'No Ticket #'}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${appointment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
