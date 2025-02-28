
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/types/appointment";
import { Calendar, Clock, Car, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface AppointmentItemProps {
  appointment: AppointmentWithRelations;
}

export const AppointmentItem = ({ appointment }: AppointmentItemProps) => {
  const navigate = useNavigate();
  
  // Get the appropriate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "h:mm a");
  };

  // Get vehicle details if available
  const vehicle = appointment.vehicle || 
    (appointment.job_tickets && appointment.job_tickets[0]?.vehicle);
    
  // Handle ticket click
  const handleTicketClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/job-tickets?id=${ticketId}`);
  };

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-all">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h4 className="font-medium text-gray-900">{appointment.service_type}</h4>
        <Badge className={`${getStatusColor(appointment.status)}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </Badge>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-700">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {formatDate(appointment.start_time)}
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
          </div>
        </div>
        
        {vehicle && (
          <div className="flex items-center text-sm text-gray-700">
            <Car className="h-4 w-4 text-gray-400 mr-2" />
            <span>
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.license_plate && (
                <span className="ml-1 text-gray-500">({vehicle.license_plate})</span>
              )}
            </span>
          </div>
        )}
        
        {appointment.notes && (
          <div className="text-sm text-gray-600 pt-2 border-t border-gray-100 mt-2">
            {appointment.notes}
          </div>
        )}
        
        {appointment.job_tickets && appointment.job_tickets.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <h5 className="text-sm font-medium mb-2">Job Tickets:</h5>
            <div className="flex flex-wrap gap-2">
              {appointment.job_tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={(e) => handleTicketClick(ticket.id, e)}
                  className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  {ticket.ticket_number}
                  <ExternalLink className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
