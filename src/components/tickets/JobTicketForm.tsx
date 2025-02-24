
import { Button } from "@/components/ui/button";
import { JobTicketFormProps } from "@/types/job-ticket";
import { useJobTicketForm } from "@/hooks/use-job-ticket-form";
import { JobTicketFormFields } from "./JobTicketFormFields";

export const JobTicketForm = (props: JobTicketFormProps) => {
  const {
    formData,
    setFormData,
    isSubmitting,
    selectedAppointmentId,
    setSelectedAppointmentId,
    clients,
    clientVehicles,
    clientAppointments,
    technicians,
    handleSubmit,
  } = useJobTicketForm(props);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <JobTicketFormFields
        formData={formData}
        setFormData={setFormData}
        clients={clients}
        clientVehicles={clientVehicles}
        clientAppointments={clientAppointments}
        selectedAppointmentId={selectedAppointmentId}
        setSelectedAppointmentId={setSelectedAppointmentId}
        technicians={technicians}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={props.onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : props.initialData ? "Update Ticket" : "Create Ticket"}
        </Button>
      </div>
    </form>
  );
};
