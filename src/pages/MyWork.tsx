
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlayCircle, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { JobTicket } from "@/types/job-ticket";

const MyWork = () => {
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const queryClient = useQueryClient();

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

  // Fetch latest clock event for each ticket
  const { data: clockEvents } = useQuery({
    queryKey: ["clock_events"],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("clock_events")
        .select("*")
        .eq("technician_id", (await supabase.auth.getUser()).data.user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return events;
    },
  });

  const clockMutation = useMutation({
    mutationFn: async ({ ticketId, eventType }: { ticketId: string, eventType: 'clock_in' | 'clock_out' }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // Create clock event
      const { error: clockError } = await supabase
        .from("clock_events")
        .insert({
          job_ticket_id: ticketId,
          technician_id: userId,
          event_type: eventType,
        });

      if (clockError) throw clockError;

      if (eventType === 'clock_in') {
        // Create new time entry when clocking in
        const { error: timeEntryError } = await supabase
          .from("time_entries")
          .insert({
            job_ticket_id: ticketId,
            technician_id: userId,
            start_time: new Date().toISOString(),
          });

        if (timeEntryError) throw timeEntryError;
      } else {
        // Update the latest time entry when clocking out
        const { data: latestTimeEntry, error: fetchError } = await supabase
          .from("time_entries")
          .select("*")
          .eq("job_ticket_id", ticketId)
          .eq("technician_id", userId)
          .is("end_time", null)
          .single();

        if (fetchError) throw fetchError;

        if (latestTimeEntry) {
          const endTime = new Date();
          const startTime = new Date(latestTimeEntry.start_time);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

          const { error: updateError } = await supabase
            .from("time_entries")
            .update({
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
            })
            .eq("id", latestTimeEntry.id);

          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clock_events"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast.success("Clock event recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record clock event");
      console.error("Clock event error:", error);
    },
  });

  const getLatestClockEvent = (ticketId: string) => {
    return clockEvents?.find(event => event.job_ticket_id === ticketId);
  };

  const handleClockAction = (ticket: JobTicket) => {
    const latestEvent = getLatestClockEvent(ticket.id);
    const eventType = !latestEvent || latestEvent.event_type === 'clock_out' ? 'clock_in' : 'clock_out';
    clockMutation.mutate({ ticketId: ticket.id, eventType });
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">My Work</h1>
          <p className="text-gray-500">Manage your assigned job tickets</p>
        </div>

        <div className="space-y-4">
          {tickets?.map((ticket) => {
            const latestEvent = getLatestClockEvent(ticket.id);
            const isClockedIn = latestEvent?.event_type === 'clock_in';

            return (
              <div
                key={ticket.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {ticket.ticket_number}
                    </h3>
                    <p className="mt-1 text-gray-500">
                      {ticket.client?.first_name} {ticket.client?.last_name}
                    </p>
                    {ticket.vehicle && (
                      <p className="text-sm text-gray-500">
                        {ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {ticket.description}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleClockAction(ticket)}
                    variant={isClockedIn ? "destructive" : "default"}
                    className="gap-2"
                  >
                    {isClockedIn ? (
                      <>
                        <StopCircle className="h-5 w-5" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-5 w-5" />
                        Clock In
                      </>
                    )}
                  </Button>
                </div>
                {latestEvent && (
                  <p className="mt-2 text-sm text-gray-500">
                    Last action: {latestEvent.event_type === 'clock_in' ? 'Clocked in' : 'Clocked out'} at{' '}
                    {format(new Date(latestEvent.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                )}
              </div>
            );
          })}
          {(!tickets || tickets.length === 0) && (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No job tickets assigned to you</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyWork;
