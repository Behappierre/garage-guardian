
import { JobTicket } from "@/types/job-ticket";
import { Clock } from "lucide-react";
import { useDrag } from "react-dnd";
import { cn } from "@/lib/utils";

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

  // Define shadow colors based on priority
  const priorityShadow = {
    low: "",
    normal: "",
    high: "shadow-[0_0_10px_rgba(249,115,22,0.3)]", // Orange shadow
    urgent: "shadow-[0_0_10px_rgba(234,56,76,0.3)]" // Red shadow
  };

  return (
    <div
      ref={drag}
      className={cn(
        "bg-white p-3 rounded-md cursor-pointer border border-gray-100 hover:shadow-md transition-shadow",
        priorityShadow[ticket.priority as keyof typeof priorityShadow],
        isDragging ? 'opacity-50' : 'opacity-100'
      )}
      onClick={() => onTicketClick(ticket)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-left">{ticket.ticket_number}</div>
          {ticket.vehicle?.license_plate && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="bg-[#FEF7CD] text-gray-700 px-2 py-0.5 rounded border border-gray-200 font-medium">
                {ticket.vehicle.license_plate}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-2">
        {onClockAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClockAction(ticket);
            }}
            className={cn(
              "flex items-center gap-1 text-xs rounded-full px-2 py-0.5",
              isClockedIn 
                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            )}
          >
            <Clock className="h-3 w-3" />
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        )}
      </div>
    </div>
  );
}
