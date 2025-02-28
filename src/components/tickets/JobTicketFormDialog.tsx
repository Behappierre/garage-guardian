
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import type { JobTicket } from "@/types/job-ticket";

interface JobTicketFormDialogProps {
  showTicketForm: boolean;
  selectedTicket: JobTicket | null;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export const JobTicketFormDialog = ({
  showTicketForm,
  selectedTicket,
  onOpenChange,
  onClose,
}: JobTicketFormDialogProps) => {
  return (
    <Dialog 
      open={showTicketForm} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedTicket ? "Edit Job Ticket" : "Create New Job Ticket"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <JobTicketForm
            initialData={selectedTicket}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
