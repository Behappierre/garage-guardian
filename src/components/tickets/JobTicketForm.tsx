
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"];
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

interface JobTicketFormProps {
  clientId?: string;
  vehicleId?: string;
  onClose: () => void;
  initialData?: Pick<JobTicket, "id" | "ticket_number" | "description" | "status" | "priority" | "assigned_technician_id">;
}

export const JobTicketForm = ({ clientId, vehicleId, onClose, initialData }: JobTicketFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    status: (initialData?.status || "received") as TicketStatus,
    priority: (initialData?.priority || "normal") as TicketPriority,
    assigned_technician_id: initialData?.assigned_technician_id || null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from("job_tickets")
          .update(formData)
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Job ticket updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("job_tickets")
          .insert({
            ...formData,
            client_id: clientId || null,
            vehicle_id: vehicleId || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Job ticket created successfully",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["job_tickets"] });
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TicketPriority }))}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TicketStatus }))}
          >
            <option value="received">Received</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="pending_parts">Pending Parts</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned_technician_id">Assigned Technician</Label>
        <Input
          id="assigned_technician_id"
          value={formData.assigned_technician_id || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, assigned_technician_id: e.target.value || null }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Ticket" : "Create Ticket"}
        </Button>
      </div>
    </form>
  );
};
