
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import type { JobTicket } from "@/types/job-ticket";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="sm:max-w-[600px] p-0 max-h-[85vh] overflow-hidden" closeButton={true}>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>
            {isLoading ? (
              "Loading Job Ticket..."
            ) : selectedTicket ? (
              <>
                Edit Job Ticket
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedTicket.ticket_number}
                </span>
              </>
            ) : (
              "Create New Job Ticket"
            )}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4 px-6 pb-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(85vh-100px)]">
            <div className="px-6 pb-4">
              <JobTicketForm
                initialData={selectedTicket}
                onClose={onClose}
                linkedAppointmentId={linkedAppointmentId}
              />
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
