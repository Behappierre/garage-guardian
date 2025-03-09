
import { Button } from "@/components/ui/button";
import { JobTicketFormProps } from "@/types/job-ticket";
import { useJobTicketForm } from "@/hooks/use-job-ticket-form";
import { JobTicketFormFields } from "./JobTicketFormFields";
import { TimeEntriesList } from "./TimeEntriesList";

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
    onEnhanceDescription,
  } = useJobTicketForm(props);

  console.log("Current form data in JobTicketForm:", formData);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      <div className="space-y-6">
        <JobTicketFormFields
          formData={formData}
          setFormData={setFormData}
          clients={clients}
          clientVehicles={clientVehicles}
          clientAppointments={clientAppointments}
          selectedAppointmentId={selectedAppointmentId}
          setSelectedAppointmentId={setSelectedAppointmentId}
          technicians={technicians}
          onEnhanceDescription={onEnhanceDescription}
        />

        {props.initialData && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Time Entries</h3>
            <TimeEntriesList jobTicketId={props.initialData.id} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
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
