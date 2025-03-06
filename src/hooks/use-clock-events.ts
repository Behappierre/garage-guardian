
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobTicket } from "@/types/job-ticket";

export const useClockEvents = () => {
  const queryClient = useQueryClient();

  const { data: clockEvents } = useQuery({
    queryKey: ["clock_events"],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const { data: events, error } = await supabase
        .from("clock_events")
        .select("*")
        .eq("technician_id", userId)
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

        if (timeEntryError) {
          console.error("Error creating time entry:", timeEntryError);
          throw timeEntryError;
        }
      } else {
        // Update the latest time entry when clocking out
        const { data: latestTimeEntries, error: fetchError } = await supabase
          .from("time_entries")
          .select("*")
          .eq("job_ticket_id", ticketId)
          .eq("technician_id", userId)
          .is("end_time", null)
          .order("start_time", { ascending: false });

        if (fetchError) {
          console.error("Error fetching time entries:", fetchError);
          throw fetchError;
        }

        // Use the first entry if available, otherwise handle the no-entries case
        if (latestTimeEntries && latestTimeEntries.length > 0) {
          const latestTimeEntry = latestTimeEntries[0];
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

          if (updateError) {
            console.error("Error updating time entry:", updateError);
            throw updateError;
          }
        } else {
          console.warn("No open time entry found to close for ticket:", ticketId);
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
    if (!clockEvents || clockEvents.length === 0) return null;
    
    // Filter events for this specific ticket and sort by created_at in descending order
    const ticketEvents = clockEvents
      .filter(event => event.job_ticket_id === ticketId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Return the most recent event if it exists
    return ticketEvents.length > 0 ? ticketEvents[0] : null;
  };

  const handleClockAction = (ticket: JobTicket) => {
    const latestEvent = getLatestClockEvent(ticket.id);
    const eventType = !latestEvent || latestEvent.event_type === 'clock_out' ? 'clock_in' : 'clock_out';
    
    console.log(`Clocking ${eventType} for ticket ${ticket.id}, latest event:`, latestEvent);
    clockMutation.mutate({ ticketId: ticket.id, eventType });
  };

  return {
    clockEvents,
    getLatestClockEvent,
    handleClockAction,
  };
};
