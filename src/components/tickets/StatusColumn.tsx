
import type { JobTicket, TicketStatus } from "@/types/job-ticket";
import { JobTicketCard } from "./JobTicketCard";
import { useDrop } from "react-dnd";

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

  return (
    <div 
      ref={drop} 
      className={`bg-gray-100 rounded-lg p-4 transition-colors ${isOver ? 'bg-gray-200' : ''}`}
    >
      <h3 className="font-medium text-gray-700 mb-4">{label}</h3>
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const latestEvent = getLatestClockEvent(ticket.id);
          const isClockedIn = latestEvent?.event_type === 'clock_in';

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
