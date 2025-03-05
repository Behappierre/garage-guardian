
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket } from "@/types/job-ticket";
import { StatusColumn } from "@/components/tickets/StatusColumn";
import { useClockEvents } from "@/hooks/use-clock-events";
import { PageHeader } from "@/components/ui/page-header";
import { useTheme } from "next-themes";
import { useState } from "react";
import { JobTicketFormDialog } from "@/components/tickets/JobTicketFormDialog";

const statusColumns = [
  { key: 'received', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_parts', label: 'On Hold' },
  { key: 'completed', label: 'Complete' },
  { key: 'cancelled', label: 'Cancelled' }
] as const;

const MyWork = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);

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

  const handleTicketClick = (ticket: JobTicket) => {
    setSelectedTicket(ticket);
    setShowTicketForm(true);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const getTicketsByStatus = (status: string) => {
    return tickets?.filter(ticket => ticket.status === status) || [];
  };

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="My Work"
        description="Manage your assigned job tickets"
        className={isDarkMode ? "bg-black" : ""}
      />

      <div className="px-8 pb-8">
        <div className="grid grid-cols-5 gap-4">
          {statusColumns.map(column => (
            <StatusColumn
              key={column.key}
              label={column.label}
              tickets={getTicketsByStatus(column.key)}
              getLatestClockEvent={getLatestClockEvent}
              onClockAction={handleClockAction}
              onTicketClick={handleTicketClick}
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
        onClose={() => {
          setShowTicketForm(false);
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};

export default MyWork;
