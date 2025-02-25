
import type { JobTicket } from "@/types/job-ticket";
import { JobTicketCard } from "./JobTicketCard";

interface StatusColumnProps {
  label: string;
  tickets: JobTicket[];
  getLatestClockEvent: (ticketId: string) => any;
  onClockAction: (ticket: JobTicket) => void;
}

export const StatusColumn = ({ 
  label, 
  tickets, 
  getLatestClockEvent, 
  onClockAction 
}: StatusColumnProps) => {
  return (
    <div className="bg-gray-100 rounded-lg p-4">
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
            />
          );
        })}
      </div>
    </div>
  );
};
