
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client: {
    first_name: string;
    last_name: string;
  };
};

interface JobTicketListProps {
  onSelectTicket: (ticket: JobTicket) => void;
}

export const JobTicketList = ({ onSelectTicket }: JobTicketListProps) => {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobTicket[];
    },
  });

  if (isLoading) {
    return <div>Loading tickets...</div>;
  }

  if (!tickets?.length) {
    return <div>No tickets found</div>;
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div 
          key={ticket.id}
          onClick={() => onSelectTicket(ticket)}
          className="p-4 bg-white rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{ticket.ticket_number}</h3>
              <p className="text-sm text-gray-600">{ticket.description}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500">
                {ticket.client ? `${ticket.client.first_name} ${ticket.client.last_name}` : 'No client assigned'}
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                ticket.status === 'pending_parts' ? 'bg-yellow-100 text-yellow-800' :
                ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
