
import { JobTicket } from "@/types/job-ticket";
import { Clock, User, ExternalLink } from "lucide-react";
import { useDrag } from "react-dnd";

interface JobTicketCardProps {
  ticket: JobTicket;
  isClockedIn?: boolean;
  onClockAction?: (ticket: JobTicket) => void;
  onTicketClick: (ticket: JobTicket) => void;
}

export const JobTicketCard = ({ 
  ticket, 
  isClockedIn, 
  onClockAction, 
  onTicketClick 
}: JobTicketCardProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'JOB_TICKET',
    item: { id: ticket.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const statusColors = {
    draft: "bg-gray-100 text-gray-600",
    received: "bg-blue-100 text-blue-600",
    in_progress: "bg-yellow-100 text-yellow-600",
    pending_parts: "bg-purple-100 text-purple-600",
    completed: "bg-green-100 text-green-600",
    cancelled: "bg-red-100 text-red-600"
  };

  const priorityColors = {
    low: "bg-gray-50 text-gray-600 border-gray-200",
    normal: "bg-blue-50 text-blue-600 border-blue-200",
    high: "bg-orange-50 text-orange-600 border-orange-200",
    urgent: "bg-red-50 text-red-600 border-red-200"
  };

  return (
    <div
      ref={drag}
      className={`bg-white p-3 rounded-md shadow-sm cursor-pointer border border-gray-100 
                 hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => onTicketClick(ticket)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{ticket.ticket_number}</div>
          <div className="text-sm text-gray-500 truncate max-w-[200px]">{ticket.description}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status as keyof typeof statusColors]}`}>
            {ticket.status === 'in_progress' ? 'In Progress' : 
             ticket.status === 'pending_parts' ? 'On Hold' : 
             ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </div>
        </div>
      </div>
      
      <div className="mt-2">
        {ticket.vehicle && (
          <div className="text-xs text-gray-500">
            {ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}
            {ticket.vehicle.license_plate && ` • ${ticket.vehicle.license_plate}`}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2">
        {ticket.assigned_technician_id ? (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="h-3 w-3" />
            <span>Assigned</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <User className="h-3 w-3" />
            <span>Unassigned</span>
          </div>
        )}
        
        {onClockAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClockAction(ticket);
            }}
            className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${
              isClockedIn 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        )}
      </div>
    </div>
  );
}
