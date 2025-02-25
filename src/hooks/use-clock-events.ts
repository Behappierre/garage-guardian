
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobTicket } from "@/types/job-ticket";

export const useClockEvents = () => {
  const queryClient = useQueryClient();

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

  return {
    clockEvents,
    getLatestClockEvent,
    handleClockAction,
  };
};
