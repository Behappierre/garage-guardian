
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
      <DialogContent className="sm:max-w-[600px] p-6 max-h-[90vh]" closeButton={true}>
        <DialogHeader className="pb-4">
          <DialogTitle>
            {isLoading ? (
              "Loading Job Ticket..."
            ) : selectedTicket ? (
              <>
                Edit Job Ticket
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  JT-{selectedTicket.id}
                </span>
              </>
            ) : (
              "Create New Job Ticket"
            )}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4 p-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <ScrollArea className="pr-4 max-h-[calc(90vh-120px)]">
            <JobTicketForm
              initialData={selectedTicket}
              onClose={onClose}
              linkedAppointmentId={linkedAppointmentId}
            />
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
