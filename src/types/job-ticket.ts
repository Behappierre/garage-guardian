
import type { Database } from "@/integrations/supabase/types";

export type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client?: Database["public"]["Tables"]["clients"]["Row"] | null;
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
};
export type TicketStatus = "received" | "in_progress" | "pending_parts" | "completed" | "cancelled" | "draft";
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
export type TicketType = "routine_service" | "repair";

export type JobTicketFormData = {
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_technician_id: string | null;
  client_id: string | null;
  vehicle_id: string | null;
  ticket_type: TicketType;
};

export interface JobTicketFormProps {
  clientId?: string;
  vehicleId?: string;
  onClose: () => void;
  initialData?: JobTicket;
  linkedAppointmentId?: string | null;
}
