
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const formatDescription = (description: string) => {
  // Split the text into segments based on **
  const segments = description.split('**');
  return segments.map((segment, index) => {
    // Even indices are normal text, odd indices are bold
    if (index % 2 === 0) {
      return <span key={index}>{segment}</span>;
    } else {
      // Add line breaks before and after bold text
      return (
        <span key={index}>
          <br />
          <strong>{segment}</strong>
          <br />
        </span>
      );
    }
  });
};

export const JobTicketsList = ({ tickets, isLoading, onTicketClick }: JobTicketsListProps) => {
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({});

  // Fetch time entries for all tickets to calculate hours booked
  const { data: timeEntries } = useQuery({
    queryKey: ["job-tickets-time-entries"],
    queryFn: async () => {
      if (!tickets?.length) return {};
      
      const ticketIds = tickets.map(ticket => ticket.id);
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .in("job_ticket_id", ticketIds);
      
      if (error) throw error;
      
      // Group time entries by job ticket ID
      const entriesByTicket: Record<string, any[]> = {};
      data.forEach(entry => {
        if (!entriesByTicket[entry.job_ticket_id]) {
          entriesByTicket[entry.job_ticket_id] = [];
        }
        entriesByTicket[entry.job_ticket_id].push(entry);
      });
      
      return entriesByTicket;
    }
  });

  // Calculate total hours booked for a ticket
  const getHoursBooked = (ticketId: string): string => {
    if (!timeEntries || !timeEntries[ticketId]) {
      return "0h";
    }
    
    const entries = timeEntries[ticketId];
    let totalMinutes = 0;
    
    entries.forEach(entry => {
      if (entry.duration_minutes) {
        totalMinutes += entry.duration_minutes;
      } else if (entry.start_time && entry.end_time) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        totalMinutes += durationMinutes;
      }
    });
    
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

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

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div 
            onClick={() => onTicketClick(ticket)}
            className="p-4 cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="font-medium">{ticket.ticket_number}</span>
                  {ticket.client && (
                    <span className="ml-3 text-gray-600">
                      {ticket.client.first_name} {ticket.client.last_name}
                    </span>
                  )}
                  {ticket.vehicle && ticket.vehicle.license_plate && (
                    <span className="ml-3 text-gray-500">
                      ({ticket.vehicle.license_plate})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{getHoursBooked(ticket.id)}</span>
                </div>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'pending_parts' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {formatStatus(ticket.status)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Priority: {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => toggleExpand(ticket.id, e)}
                  className="ml-2"
                >
                  {expandedTickets[ticket.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {expandedTickets[ticket.id] && (
              <div className="mt-4 space-y-3 border-t pt-3">
                {ticket.vehicle && (
                  <p className="text-sm text-gray-600">
                    Vehicle: {ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}
                  </p>
                )}
                <div className="text-sm">
                  {formatDescription(ticket.description || '')}
                </div>
                <p className="text-xs text-gray-500">
                  Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
