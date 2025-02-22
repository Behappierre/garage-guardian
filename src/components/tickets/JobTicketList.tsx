
import { AlertCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface JobTicket {
  id: string;
  ticket_number: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
  };
}

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JobTicket[];
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending_parts":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading tickets...</div>;
  }

  return (
    <div className="space-y-4">
      {tickets?.map((ticket) => (
        <div
          key={ticket.id}
          className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectTicket(ticket)}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-gray-900">{ticket.ticket_number}</h3>
              <p className="text-sm text-gray-500">
                {ticket.client.first_name} {ticket.client.last_name}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(ticket.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}

      {tickets?.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No job tickets found</p>
        </div>
      )}
    </div>
  );
};
