
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client?: Database["public"]["Tables"]["clients"]["Row"] | null;
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
};

const JobTickets = () => {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobTicket[];
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Job Tickets</h1>
              <p className="text-gray-500">Manage service job tickets</p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setSelectedTicket(null);
                setShowTicketForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              New Job Ticket
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading job tickets...</div>
        ) : !tickets?.length ? (
          <div className="text-center py-4">No job tickets found</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowTicketForm(true);
                }}
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
                      </p>
                    )}
                    <p className="text-sm mt-2">{ticket.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'pending_parts' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')}
                    </span>
                    <p className="text-sm mt-1 text-gray-500">
                      Priority: {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTicket ? "Edit Job Ticket" : "Create New Job Ticket"}
              </DialogTitle>
            </DialogHeader>
            <JobTicketForm
              initialData={selectedTicket}
              onClose={() => {
                setShowTicketForm(false);
                setSelectedTicket(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default JobTickets;
