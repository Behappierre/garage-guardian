
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket } from "@/types/job-ticket";
import { StatusColumn } from "@/components/tickets/StatusColumn";
import { useClockEvents } from "@/hooks/use-clock-events";

const statusColumns = [
  { key: 'received', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_parts', label: 'Waiting for Parts' },
  { key: 'completed', label: 'Complete' },
  { key: 'cancelled', label: 'Cancelled' }
] as const;

const MyWork = () => {
  // Fetch assigned tickets
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

  const { getLatestClockEvent, handleClockAction } = useClockEvents();

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const getTicketsByStatus = (status: string) => {
    return tickets?.filter(ticket => ticket.status === status) || [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Work</h1>
          <p className="text-gray-500">Manage your assigned job tickets</p>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {statusColumns.map(column => (
            <StatusColumn
              key={column.key}
              label={column.label}
              tickets={getTicketsByStatus(column.key)}
              getLatestClockEvent={getLatestClockEvent}
              onClockAction={handleClockAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyWork;
