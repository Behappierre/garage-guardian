
import type { JobTicket, TicketStatus } from "@/types/job-ticket";
import { JobTicketCard } from "./JobTicketCard";
import { useDrop } from "react-dnd";
import { Badge } from "@/components/ui/badge";

interface StatusColumnProps {
  label: string;
  status: TicketStatus;
  tickets: JobTicket[];
  getLatestClockEvent: (ticketId: string) => any;
  onClockAction: (ticket: JobTicket) => void;
  onTicketClick: (ticket: JobTicket) => void;
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
}

export const StatusColumn = ({ 
  label, 
  status,
  tickets, 
  getLatestClockEvent, 
  onClockAction,
  onTicketClick,
  onStatusChange
}: StatusColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'JOB_TICKET',
    drop: (item: { id: string }) => {
      onStatusChange(item.id, status);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Get status badge variant and color
  const getStatusVariant = () => {
    switch (status) {
      case 'received': 
        return { variant: 'outline' as const, className: 'border-blue-200 text-blue-600 bg-blue-50' };
      case 'in_progress': 
        return { variant: 'outline' as const, className: 'border-yellow-200 text-yellow-600 bg-yellow-50' };
      case 'pending_parts': 
        return { variant: 'outline' as const, className: 'border-purple-200 text-purple-600 bg-purple-50' };
      case 'completed': 
        return { variant: 'outline' as const, className: 'border-green-200 text-green-600 bg-green-50' };
      case 'cancelled': 
        return { variant: 'outline' as const, className: 'border-red-200 text-red-600 bg-red-50' };
      default: 
        return { variant: 'outline' as const, className: '' };
    }
  };

  const { variant, className } = getStatusVariant();

  return (
    <div 
      ref={drop} 
      className={`bg-gray-100 rounded-lg p-4 transition-colors ${isOver ? 'bg-gray-200' : ''}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-medium text-gray-700">{label}</h3>
        <Badge variant={variant} className={className}>
          {tickets.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const latestEvent = getLatestClockEvent(ticket.id);
          const isClockedIn = latestEvent && latestEvent.event_type === 'clock_in';

          return (
            <JobTicketCard
              key={ticket.id}
              ticket={ticket}
              isClockedIn={isClockedIn}
              onClockAction={onClockAction}
              onTicketClick={onTicketClick}
            />
          );
        })}
      </div>
    </div>
  );
};
