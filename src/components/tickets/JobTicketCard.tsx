
import { Button } from "@/components/ui/button";
import { PlayCircle, StopCircle } from "lucide-react";
import type { JobTicket } from "@/types/job-ticket";

interface JobTicketCardProps {
  ticket: JobTicket;
  isClockedIn: boolean;
  onClockAction: (ticket: JobTicket) => void;
}

export const JobTicketCard = ({ ticket, isClockedIn, onClockAction }: JobTicketCardProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-gray-900">
          {ticket.ticket_number}
        </span>
        <Button
          onClick={() => onClockAction(ticket)}
          variant={isClockedIn ? "destructive" : "default"}
          size="sm"
          className="h-7"
        >
          {isClockedIn ? (
            <StopCircle className="h-4 w-4" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
        </Button>
      </div>

      {ticket.client && (
        <p className="text-sm text-gray-600">
          {ticket.client.first_name} {ticket.client.last_name}
        </p>
      )}
      
      {ticket.vehicle && (
        <div className="text-xs text-gray-500">
          <p>{ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}</p>
          {ticket.vehicle.license_plate && (
            <p className="mt-1">Reg: {ticket.vehicle.license_plate}</p>
          )}
        </div>
      )}
    </div>
  );
};
