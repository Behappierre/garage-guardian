
import { Button } from "@/components/ui/button";
import { JobTicketFormProps } from "@/types/job-ticket";
import { useJobTicketForm } from "@/hooks/use-job-ticket-form";
import { JobTicketFormFields } from "./JobTicketFormFields";
import { TimeEntriesList } from "./TimeEntriesList";
import { Wand2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
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
          />

          {props.initialData && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Time Entries</h3>
              <TimeEntriesList jobTicketId={props.initialData.id} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onEnhanceDescription && (
          <Button type="button" variant="outline" size="sm" onClick={onEnhanceDescription}>
            <Wand2 className="h-4 w-4 mr-1" />
            <span>Enhance</span>
          </Button>
        )}
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
