
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return <div className="text-center py-4">Loading job tickets...</div>;
  }

  if (!tickets?.length) {
    return <div className="text-center py-4">No job tickets found</div>;
  }

  const toggleExpand = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  const getDescriptionPreview = (description: string) => {
    const lines = description.split('\n').filter(line => line.trim());
    if (lines.length <= 5) return description;
    return lines.slice(0, 5).join('\n');
  };

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => onTicketClick(ticket)}
          className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
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
              <div className="mt-2 text-sm whitespace-pre-line">
                {expandedTickets[ticket.id] 
                  ? ticket.description
                  : getDescriptionPreview(ticket.description || '')}
                {ticket.description && ticket.description.split('\n').filter(line => line.trim()).length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={(e) => toggleExpand(ticket.id, e)}
                  >
                    {expandedTickets[ticket.id] ? (
                      <ChevronUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    )}
                    {expandedTickets[ticket.id] ? "Less" : "More"}
                  </Button>
                )}
              </div>
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
