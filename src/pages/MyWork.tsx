
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlayCircle, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { JobTicket } from "@/types/job-ticket";

const statusColumns = [
  { key: 'received', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_parts', label: 'Waiting for Parts' },
  { key: 'completed', label: 'Complete' },
  { key: 'cancelled', label: 'Cancelled' }
] as const;

const MyWork = () => {
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
            <div key={column.key} className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-4">{column.label}</h3>
              <div className="space-y-3">
                {getTicketsByStatus(column.key).map((ticket) => {
                  const latestEvent = getLatestClockEvent(ticket.id);
                  const isClockedIn = latestEvent?.event_type === 'clock_in';

                  return (
                    <div
                      key={ticket.id}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">
                          {ticket.ticket_number}
                        </span>
                        <Button
                          onClick={() => handleClockAction(ticket)}
                          variant={isClockedIn ? "destructive" : "default"}
                          size="sm"
                          className="h-7"
                        >
                          {isClockedIn ? (
                            <StopCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {ticket.client && (
                        <p className="text-sm text-gray-600">
                          {ticket.client.first_name} {ticket.client.last_name}
                        </p>
                      )}
                      
                      {ticket.vehicle && (
                        <div className="text-xs text-gray-500">
                          <p>{ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}</p>
                          {ticket.vehicle.license_plate && (
                            <p className="mt-1">Reg: {ticket.vehicle.license_plate}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyWork;
