
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket, TicketStatus } from "@/types/job-ticket";
import { StatusColumn } from "@/components/tickets/StatusColumn";
import { useClockEvents } from "@/hooks/use-clock-events";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import { JobTicketFormDialog } from "@/components/tickets/JobTicketFormDialog";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";

const statusColumns = [
  { key: 'received', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_parts', label: 'On Hold' },
  { key: 'completed', label: 'Complete' },
  { key: 'cancelled', label: 'Cancelled' }
] as const;

const MyWork = () => {
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["assigned_tickets"],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq("assigned_technician_id", (await supabase.auth.getUser()).data.user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return tickets as JobTicket[];
    },
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string, newStatus: TicketStatus }) => {
      console.log(`Updating ticket ${ticketId} to status ${newStatus}`);
      const { error } = await supabase
        .from("job_tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);
      
      if (error) throw error;
      return { ticketId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned_tickets"] });
      toast.success("Ticket status updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update ticket status: ${error.message}`);
    }
  });

  const { getLatestClockEvent, handleClockAction } = useClockEvents();

  const handleTicketClick = (ticket: JobTicket) => {
    setSelectedTicket(ticket);
    setShowTicketForm(true);
  };

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    if (!ticket) return;
    
    if (ticket.status !== newStatus) {
      updateTicketStatus.mutate({ ticketId, newStatus });
    }
  };

  const handleFormClose = () => {
    setShowTicketForm(false);
    setSelectedTicket(null);
    // Refresh the tickets data when form is closed
    queryClient.invalidateQueries({ queryKey: ["assigned_tickets"] });
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const getTicketsByStatus = (status: TicketStatus) => {
    return tickets?.filter(ticket => ticket.status === status) || [];
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col w-full h-full bg-background">
        <PageHeader
          title="My Work"
          description="Manage your assigned job tickets"
        />

        <div className="px-8 pb-8">
          <div className="grid grid-cols-5 gap-4">
            {statusColumns.map(column => (
              <StatusColumn
                key={column.key}
                label={column.label}
                status={column.key}
                tickets={getTicketsByStatus(column.key)}
                getLatestClockEvent={getLatestClockEvent}
                onClockAction={handleClockAction}
                onTicketClick={handleTicketClick}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>

        <JobTicketFormDialog
          showTicketForm={showTicketForm}
          selectedTicket={selectedTicket}
          onOpenChange={(open) => {
            setShowTicketForm(open);
            if (!open) setSelectedTicket(null);
          }}
          onClose={handleFormClose}
        />
      </div>
    </DndProvider>
  );
};

export default MyWork;
