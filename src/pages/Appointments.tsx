
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, TicketPlus } from "lucide-react";
import { JobTicketList } from "@/components/tickets/JobTicketList";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client: {
    first_name: string;
    last_name: string;
  };
};

const Appointments = () => {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);

  const handleSelectTicket = (ticket: JobTicket) => {
    setSelectedTicket(ticket);
    setShowTicketForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Job Tickets</h1>
              <p className="text-gray-500">Manage service requests and work orders</p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowTicketForm(true)}
              className="gap-2"
            >
              <TicketPlus className="h-5 w-5" />
              Create Job Ticket
            </Button>
          </div>
        </div>

        <JobTicketList onSelectTicket={handleSelectTicket} />

        <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedTicket ? "Edit Job Ticket" : "Create New Job Ticket"}</DialogTitle>
            </DialogHeader>
            <JobTicketForm
              initialData={selectedTicket || undefined}
              onClose={() => {
                setShowTicketForm(false);
                setSelectedTicket(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Appointments;
