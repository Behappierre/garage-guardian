
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import { JobTicketFilters } from "@/components/tickets/JobTicketFilters";
import { JobTicketsList } from "@/components/tickets/JobTicketsList";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  client?: Database["public"]["Tables"]["clients"]["Row"] | null;
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
};

type SortField = "created_at" | "client_name";
type SortOrder = "asc" | "desc";

const JobTickets = () => {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets", nameFilter, dateFilter, registrationFilter, sortField, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `);

      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        query = query.gte('created_at', filterDate.toISOString())
                    .lt('created_at', nextDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      let sortedData = (data as JobTicket[]).filter(ticket => {
        const matchesName = nameFilter 
          ? `${ticket.client?.first_name} ${ticket.client?.last_name}`.toLowerCase().includes(nameFilter.toLowerCase())
          : true;
        
        const matchesRegistration = registrationFilter
          ? ticket.vehicle?.license_plate?.toLowerCase().includes(registrationFilter.toLowerCase())
          : true;

        return matchesName && matchesRegistration;
      });

      sortedData.sort((a, b) => {
        if (sortField === "client_name") {
          const aName = `${a.client?.first_name} ${a.client?.last_name}`.toLowerCase();
          const bName = `${b.client?.first_name} ${b.client?.last_name}`.toLowerCase();
          return sortOrder === "asc" 
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        } else {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
        }
      });

      return sortedData;
    },
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Job Tickets</h1>
              <p className="text-gray-500">Manage service job tickets</p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                setSelectedTicket(null);
                setShowTicketForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              New Job Ticket
            </Button>
          </div>

          <JobTicketFilters
            nameFilter={nameFilter}
            dateFilter={dateFilter}
            registrationFilter={registrationFilter}
            sortField={sortField}
            sortOrder={sortOrder}
            onNameFilterChange={setNameFilter}
            onDateFilterChange={setDateFilter}
            onRegistrationFilterChange={setRegistrationFilter}
            onSortChange={toggleSort}
          />
        </div>

        <JobTicketsList
          tickets={tickets || []}
          isLoading={isLoading}
          onTicketClick={(ticket) => {
            setSelectedTicket(ticket);
            setShowTicketForm(true);
          }}
        />

        <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTicket ? "Edit Job Ticket" : "Create New Job Ticket"}
              </DialogTitle>
            </DialogHeader>
            <JobTicketForm
              initialData={selectedTicket}
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

export default JobTickets;
