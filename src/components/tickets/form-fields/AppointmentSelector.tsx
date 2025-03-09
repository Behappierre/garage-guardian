
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useAuth } from "@/hooks/auth/useAuth";

interface AppointmentSelectorProps {
  appointmentId: string | null;
  appointments?: {
    id: string;
    start_time: string;
    service_type: string;
  }[];
  onAppointmentChange: (appointmentId: string | null) => void;
  isLoading?: boolean;
}

export const AppointmentSelector = ({
  appointmentId,
  appointments,
  onAppointmentChange,
  isLoading = false,
}: AppointmentSelectorProps) => {
  const { garageId } = useAuth();
  
  // Format the date for display
  const formatAppointmentDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const handleAppointmentChange = (value: string) => {
    if (value === "no-selection") {
      onAppointmentChange(null);
    } else if (value !== "no-appointments") {
      onAppointmentChange(value);
    }
  };

  return (
    <div className="w-full">
      <Label>Related Appointment (Optional)</Label>
      <Select
        value={appointmentId || "no-selection"}
        onValueChange={handleAppointmentChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              isLoading
                ? "Loading appointments..."
                : "Select related appointment"
            }
          />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          <ScrollArea className="h-[200px]">
            <SelectItem value="no-selection">No appointment selected</SelectItem>
            
            {appointments && appointments.length > 0 ? (
              appointments.map((appointment) => {
                // Skip any appointment with a null or empty ID
                if (!appointment.id) return null;
                
                return (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {formatAppointmentDate(appointment.start_time)} - {appointment.service_type}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-appointments">No appointments available</SelectItem>
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
}
