
import type { AppointmentStatus } from "@/types/appointment";

export interface UseAppointmentFormProps {
  initialData?: {
    id: string;
    client_id: string | null;
    vehicle_id: string | null;
    start_time: string;
    end_time: string;
    service_type: string;
    notes: string | null;
    status: AppointmentStatus;
  } | null;
  selectedDate: Date | null;
  onClose: () => void;
}

export interface AppointmentFormData {
  client_id: string;
  vehicle_id: string | null;
  start_time: string;
  end_time: string;
  service_type: string;
  notes: string | null;
  status: AppointmentStatus;
  garage_id: string | null;
}
