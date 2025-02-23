
import type { AppointmentWithRelations } from "@/types/appointment";

export interface UseAppointmentFormProps {
  initialData?: AppointmentWithRelations | null;
  selectedDate?: Date | null;
  onClose: () => void;
}

export interface AppointmentFormData {
  client_id: string;
  service_type: string;
  start_time: string;
  end_time: string;
  notes: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
}
