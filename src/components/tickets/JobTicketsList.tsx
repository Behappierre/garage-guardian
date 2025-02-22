
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client?: Database["public"]["Tables"]["clients"]["Row"] | null;
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
};

interface JobTicketsListProps {
  tickets: JobTicket[];
  isLoading: boolean;
  onTicketClick: (ticket: JobTicket) => void;
}

const formatStatus = (status: string | undefined) => {
  if (!status) return '';
  return status.replace('_', ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
};

export const JobTicketsList = ({ tickets, isLoading, onTicketClick }: JobTicketsListProps) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading job tickets...</div>;
  }

  if (!tickets?.length) {
    return <div className="text-center py-4">No job tickets found</div>;
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => onTicketClick(ticket)}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg">{ticket.ticket_number}</h3>
              {ticket.client ? (
                <p className="text-sm text-gray-600 mt-1">
                  {ticket.client.first_name} {ticket.client.last_name}
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1 italic">No client assigned</p>
              )}
              {ticket.vehicle && (
                <p className="text-sm text-gray-500">
                  {ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}
                  {ticket.vehicle.license_plate && (
                    <span className="ml-2 text-gray-600">({ticket.vehicle.license_plate})</span>
                  )}
                </p>
              )}
              <p className="text-sm mt-2">{ticket.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right flex flex-col gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  ticket.status === 'pending_parts' ? 'bg-yellow-100 text-yellow-800' :
                  ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {formatStatus(ticket.status)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-800">
                Priority: {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
