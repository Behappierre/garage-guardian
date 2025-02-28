
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import type { JobTicket } from "@/types/job-ticket";
import { Skeleton } from "@/components/ui/skeleton";

interface JobTicketFormDialogProps {
  showTicketForm: boolean;
  selectedTicket: JobTicket | null;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  isLoading?: boolean;
  linkedAppointmentId?: string | null;
}

export const JobTicketFormDialog = ({
  showTicketForm,
  selectedTicket,
  onOpenChange,
  onClose,
  isLoading = false,
  linkedAppointmentId = null,
}: JobTicketFormDialogProps) => {
  return (
    <Dialog 
      open={showTicketForm} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? "Loading Job Ticket..." : selectedTicket ? "Edit Job Ticket" : "Create New Job Ticket"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <JobTicketForm
              initialData={selectedTicket}
              onClose={onClose}
              linkedAppointmentId={linkedAppointmentId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
