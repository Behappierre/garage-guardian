
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

interface AppointmentFormProps {
  initialData?: Appointment;
  selectedDate?: Date | null;
  onClose: () => void;
}

export const AppointmentForm = ({ initialData, selectedDate, onClose }: AppointmentFormProps) => {
  const queryClient = useQueryClient();
  const defaultDate = selectedDate || new Date();
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    job_ticket_id: initialData?.job_ticket_id || null,
    service_type: initialData?.service_type || "",
    start_time: initialData?.start_time || format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    end_time: initialData?.end_time || format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    notes: initialData?.notes || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    queryKey: ["job_tickets"],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from("appointments")
          .update(formData)
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Appointment updated successfully");
      } else {
        const { error } = await supabase
          .from("appointments")
          .insert(formData);

        if (error) throw error;
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

      {formData.client_id && jobTickets?.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="job_ticket">Related Job Ticket (Optional)</Label>
          <select
            id="job_ticket"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.job_ticket_id || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, job_ticket_id: e.target.value || null }))}
          >
            <option value="">None</option>
            {jobTickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.ticket_number} - {ticket.description}
              </option>
            ))}
          </select>
        </div>
      )}

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
