
import { format } from "date-fns";
import { isWithinInterval, addDays, startOfDay, isAfter, isBefore, isEqual } from "date-fns";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentSortField, SortOrder } from "@/types/appointment";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  // Helper function to check if a date is the same day
  function isSameDay(date1: Date, date2: Date) {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }
  
  // Group appointments by date for better readability
  const appointmentsByDate: Record<string, AppointmentWithRelations[]> = {};
  const today = startOfDay(new Date());
  
  filteredAppointments.forEach(appointment => {
    if (!appointment.start_time) return;
    
    const dateKey = format(new Date(appointment.start_time), 'yyyy-MM-dd');
    if (!appointmentsByDate[dateKey]) {
      appointmentsByDate[dateKey] = [];
    }
    appointmentsByDate[dateKey].push(appointment);
  });
  
  // Sort date keys correctly (today first, then future dates in ascending order, then past dates in descending order)
  const sortedDateKeys = Object.keys(appointmentsByDate).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Today always comes first
    if (a === todayStr) return -1;
    if (b === todayStr) return 1;
    
    // Future dates (after today)
    const aIsFuture = isAfter(dateA, today);
    const bIsFuture = isAfter(dateB, today);
    
    // Past dates (before today)
    const aIsPast = isBefore(dateA, today);
    const bIsPast = isBefore(dateB, today);
    
    // If both are future dates, show nearest future date first
    if (aIsFuture && bIsFuture) {
      return dateA.getTime() - dateB.getTime(); // Ascending
    }
    
    // If both are past dates, show most recent past date first
    if (aIsPast && bIsPast) {
      return dateB.getTime() - dateA.getTime(); // Descending
    }
    
    // If one is future and one is past, future comes first
    if (aIsFuture && bIsPast) return -1;
    if (bIsFuture && aIsPast) return 1;
    
    // Default chronological order
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <ScrollArea className="h-[calc(100vh-240px)]">
      <div className="space-y-6 px-4 pb-8">
        {sortedDateKeys.map(dateKey => (
          <div key={dateKey} className="space-y-4">
            <h3 className="sticky top-0 z-10 py-2 font-semibold text-lg bg-background border-b">
              {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
              {dateKey === format(today, 'yyyy-MM-dd') && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                  Today
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              {appointmentsByDate[dateKey].map((appointment) => {
                // Skip rendering if appointment data is missing
                if (!appointment || !appointment.id) return null;
                
                return (
                  <div
                    key={appointment.id}
                    onClick={() => onSelectAppointment(appointment)}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 text-left w-full">
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
                            <div>Start: {format(new Date(appointment.start_time), "h:mm a")}</div>
                          )}
                          {appointment.end_time && (
                            <div>End: {format(new Date(appointment.end_time), "h:mm a")}</div>
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
                                  onClick={(e) => onTicketClick(ticket.id, e)}
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
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
