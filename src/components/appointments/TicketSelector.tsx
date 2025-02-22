
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Ticket {
  id: string;
  ticket_number: string;
  description: string;
}

interface TicketSelectorProps {
  clientId: string;
  tickets?: Ticket[];
  selectedTickets: string[];
  appointmentId?: string;
  onTicketSelectionChange: (selectedIds: string[]) => void;
}

export const TicketSelector = ({ 
  clientId,
  tickets = [],
  selectedTickets,
  appointmentId,
  onTicketSelectionChange,
}: TicketSelectorProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleCreateNewTicket = () => {
    const params = new URLSearchParams({
      client_id: clientId,
      return_to: 'appointments'
    });
    navigate(`/dashboard/job-tickets?${params.toString()}`);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      if (appointmentId) {
        const { error } = await supabase
          .from("appointment_job_tickets")
          .delete()
          .match({ 
            appointment_id: appointmentId,
            job_ticket_id: ticketId 
          });

        if (error) throw error;

        onTicketSelectionChange(selectedTickets.filter(id => id !== ticketId));
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
        toast.success("Job ticket removed from appointment");
      }
    } catch (error: any) {
      toast.error("Failed to remove job ticket");
    }
  };

  if (!clientId) {
    return (
      <div className="text-center py-4 text-gray-500 border rounded-md">
        Select a client to view available job tickets
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 border rounded-md">
        No job tickets available for this client
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Job Tickets</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCreateNewTicket}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>
      <div className="border rounded-md p-3 space-y-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="flex items-start justify-between gap-2 group">
            <div className="flex items-start gap-2 flex-1">
              <Checkbox
                id={`ticket-${ticket.id}`}
                checked={selectedTickets.includes(ticket.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTicketSelectionChange([...selectedTickets, ticket.id]);
                  } else {
                    onTicketSelectionChange(selectedTickets.filter(id => id !== ticket.id));
                  }
                }}
              />
              <label
                htmlFor={`ticket-${ticket.id}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
              >
                <div className="font-medium">{ticket.ticket_number}</div>
                <div className="text-gray-500">{ticket.description}</div>
              </label>
            </div>
            {selectedTickets.includes(ticket.id) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteTicket(ticket.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
