
import { Button } from "@/components/ui/button";
import { AppointmentWithRelations } from "@/pages/Appointments";
import { ClientSelector } from "./ClientSelector";
import { TicketSelector } from "./TicketSelector";
import { TimeSelector } from "./TimeSelector";
import { ServiceTypeInput } from "./ServiceTypeInput";
import { NotesInput } from "./NotesInput";
import { useAppointmentForm } from "./hooks/useAppointmentForm";

interface AppointmentFormProps {
  initialData?: AppointmentWithRelations | null;
  selectedDate?: Date | null;
  onClose: () => void;
}

export const AppointmentForm = ({ initialData, selectedDate, onClose }: AppointmentFormProps) => {
  const {
    formData,
    setFormData,
    isSubmitting,
    selectedTickets,
    setSelectedTickets,
    clients,
    jobTickets,
    handleSubmit
  } = useAppointmentForm({ initialData, selectedDate, onClose });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientSelector
        clients={clients}
        selectedClientId={formData.client_id}
        onClientChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
      />

      <TicketSelector
        clientId={formData.client_id}
        tickets={jobTickets}
        selectedTickets={selectedTickets}
        appointmentId={initialData?.id}
        onTicketSelectionChange={setSelectedTickets}
      />

      <ServiceTypeInput
        value={formData.service_type}
        onChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
      />

      <TimeSelector
        startTime={formData.start_time}
        endTime={formData.end_time}
        onStartTimeChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))}
        onEndTimeChange={(time) => setFormData(prev => ({ ...prev, end_time: time }))}
      />

      <NotesInput
        value={formData.notes}
        onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
      />

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
