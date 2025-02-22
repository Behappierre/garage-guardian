import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentWithRelations } from "@/pages/Appointments";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppointmentFormProps {
  initialData?: AppointmentWithRelations | null;
  selectedDate?: Date | null;
  onClose: () => void;
}

export const AppointmentForm = ({ initialData, selectedDate, onClose }: AppointmentFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const defaultDate = selectedDate || new Date();
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    service_type: initialData?.service_type || "",
    start_time: initialData?.start_time || format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    end_time: initialData?.end_time || format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    notes: initialData?.notes || "",
    status: initialData?.status || "scheduled" as const,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .order("first_name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: jobTickets } = useQuery({
    queryKey: ["job_tickets", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select("id, ticket_number, description")
        .eq("client_id", formData.client_id)
        .not("status", "eq", "completed");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointmentTickets } = useQuery({
    queryKey: ["appointment-tickets", initialData?.id],
    enabled: !!initialData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_job_tickets")
        .select("job_ticket_id")
        .eq("appointment_id", initialData?.id);
      
      if (error) throw error;
      return data.map(t => t.job_ticket_id);
    },
  });

  useEffect(() => {
    if (appointmentTickets) {
      setSelectedTickets(appointmentTickets);
    }
  }, [appointmentTickets]);

  const handleCreateNewTicket = () => {
    const params = new URLSearchParams({
      client_id: formData.client_id,
      return_to: 'appointments'
    });
    navigate(`/dashboard/job-tickets?${params.toString()}`);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from("appointment_job_tickets")
          .delete()
          .match({ 
            appointment_id: initialData.id,
            job_ticket_id: ticketId 
          });

        if (error) throw error;

        setSelectedTickets(prev => prev.filter(id => id !== ticketId));
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
        toast.success("Job ticket removed from appointment");
      }
    } catch (error: any) {
      toast.error("Failed to remove job ticket");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        // Update appointment
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            client_id: formData.client_id,
            service_type: formData.service_type,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes,
            status: formData.status,
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;

        // Delete existing ticket associations
        const { error: deleteError } = await supabase
          .from("appointment_job_tickets")
          .delete()
          .eq("appointment_id", initialData.id);

        if (deleteError) throw deleteError;

        // Insert new ticket associations if any tickets are selected
        if (selectedTickets.length > 0) {
          const { error: insertError } = await supabase
            .from("appointment_job_tickets")
            .insert(
              selectedTickets.map(ticketId => ({
                appointment_id: initialData.id,
                job_ticket_id: ticketId
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success("Appointment updated successfully");
      } else {
        // Create new appointment
        const { data: newAppointment, error: createError } = await supabase
          .from("appointments")
          .insert({
            client_id: formData.client_id,
            service_type: formData.service_type,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes,
            status: formData.status,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert ticket associations for the new appointment if any tickets are selected
        if (selectedTickets.length > 0 && newAppointment) {
          const { error: ticketError } = await supabase
            .from("appointment_job_tickets")
            .insert(
              selectedTickets.map(ticketId => ({
                appointment_id: newAppointment.id,
                job_ticket_id: ticketId
              }))
            );

          if (ticketError) throw ticketError;
        }

        toast.success("Appointment created successfully");
      }

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          className="w-full border border-input rounded-md h-10 px-3"
          value={formData.client_id}
          onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
          required
        >
          <option value="">Select a client</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Job Tickets</Label>
          {formData.client_id && (
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
          )}
        </div>
        {formData.client_id && jobTickets?.length > 0 ? (
          <div className="border rounded-md p-3 space-y-2">
            {jobTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-start justify-between gap-2 group">
                <div className="flex items-start gap-2 flex-1">
                  <Checkbox
                    id={`ticket-${ticket.id}`}
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTickets([...selectedTickets, ticket.id]);
                      } else {
                        setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
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
        ) : formData.client_id ? (
          <div className="text-center py-4 text-gray-500 border rounded-md">
            No job tickets available for this client
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 border rounded-md">
            Select a client to view available job tickets
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_type">Service Type</Label>
        <Input
          id="service_type"
          value={formData.service_type}
          onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Appointment" : "Create Appointment"}
        </Button>
      </div>
    </form>
  );
};
