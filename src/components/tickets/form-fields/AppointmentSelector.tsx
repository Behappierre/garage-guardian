
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AppointmentSelectorProps {
  appointmentId: string | null;
  appointments?: { id: string; start_time: string; service_type: string }[];
  onAppointmentChange: (appointmentId: string | null) => void;
  isLoading?: boolean;
}

export const AppointmentSelector = ({
  appointmentId,
  appointments,
  onAppointmentChange,
  isLoading,
}: AppointmentSelectorProps) => {
  return (
    <div>
      <Label>Link to Appointment</Label>
      <Select
        value={appointmentId || ""}
        onValueChange={(value) => onAppointmentChange(value || null)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading appointments..." : "Select appointment"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {appointments?.map((appointment) => (
            <SelectItem key={appointment.id} value={appointment.id}>
              {new Date(appointment.start_time).toLocaleString()} - {appointment.service_type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
