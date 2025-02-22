
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"];
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

interface JobTicketFormProps {
  clientId?: string;
  vehicleId?: string;
  onClose: () => void;
  initialData?: JobTicket;
}

export const JobTicketForm = ({ clientId, vehicleId, onClose, initialData }: JobTicketFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    status: (initialData?.status || "received") as TicketStatus,
    priority: (initialData?.priority || "normal") as TicketPriority,
    assigned_technician_id: initialData?.assigned_technician_id || null,
    client_id: initialData?.client_id || clientId || null,
    vehicle_id: initialData?.vehicle_id || vehicleId || null,
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

  const { data: clientVehicles } = useQuery({
    queryKey: ["vehicles", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, year, make, model")
        .eq("client_id", formData.client_id);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: clientAppointments } = useQuery({
    queryKey: ["appointments", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_time, service_type")
        .eq("client_id", formData.client_id)
        .is("job_ticket_id", null) // Only get appointments not linked to a job ticket
        .gte("start_time", new Date().toISOString()) // Only future appointments
        .order("start_time");
      
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
          .from("job_tickets")
          .update({
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assigned_technician_id: formData.assigned_technician_id,
            client_id: formData.client_id,
            vehicle_id: formData.vehicle_id
          })
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Job ticket updated successfully");
      } else {
        // For new tickets, we only need to provide required fields
        // ticket_number is generated automatically by the database trigger
        const { data: ticket, error: ticketError } = await supabase
          .from("job_tickets")
          .insert([{
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assigned_technician_id: formData.assigned_technician_id,
            client_id: formData.client_id,
            vehicle_id: formData.vehicle_id
          }])
          .select()
          .single();

        if (ticketError) throw ticketError;

        // Update the selected appointment with the job ticket id
        if (selectedAppointmentId) {
          const { error: appointmentError } = await supabase
            .from("appointments")
            .update({ job_ticket_id: ticket.id })
            .eq("id", selectedAppointmentId);

          if (appointmentError) throw appointmentError;
        }

        toast.success("Job ticket created successfully");
      }

      await queryClient.invalidateQueries({ queryKey: ["job_tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          className="w-full border border-input rounded-md h-10 px-3"
          value={formData.client_id || ""}
          onChange={(e) => {
            setFormData(prev => ({ 
              ...prev, 
              client_id: e.target.value || null,
              vehicle_id: null // Reset vehicle when client changes
            }));
            setSelectedAppointmentId(null); // Reset appointment when client changes
          }}
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

      {formData.client_id && clientVehicles?.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle (Optional)</Label>
          <select
            id="vehicle"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.vehicle_id || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value || null }))}
          >
            <option value="">Select a vehicle</option>
            {clientVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </option>
            ))}
          </select>
        </div>
      )}

      {formData.client_id && clientAppointments?.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="appointment">Link to Appointment (Optional)</Label>
          <select
            id="appointment"
            className="w-full border border-input rounded-md h-10 px-3"
            value={selectedAppointmentId || ""}
            onChange={(e) => setSelectedAppointmentId(e.target.value || null)}
          >
            <option value="">Select an appointment</option>
            {clientAppointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {new Date(appointment.start_time).toLocaleString()} - {appointment.service_type}
              </option>
            ))}
          </select>
        </div>
      )}

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
