
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JobTicketForm } from "@/components/tickets/JobTicketForm";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

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
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets", nameFilter, dateFilter, sortField, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `);

      // Apply date filter
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        query = query.gte('created_at', filterDate.toISOString())
                    .lt('created_at', nextDay.toISOString());
      }

      // Get the results and sort them in memory since we need to sort by client name
      const { data, error } = await query;

      if (error) throw error;

      let sortedData = (data as JobTicket[]).filter(ticket => {
        if (!nameFilter) return true;
        const clientName = `${ticket.client?.first_name} ${ticket.client?.last_name}`.toLowerCase();
        return clientName.includes(nameFilter.toLowerCase());
      });

      // Sort the data
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

  const formatStatus = (status: string | undefined) => {
    if (!status) return '';
    return status.replace('_', ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
  };

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

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="space-y-2">
              <Label htmlFor="nameFilter">Filter by Customer Name</Label>
              <Input
                id="nameFilter"
                placeholder="Enter customer name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFilter">Filter by Date Created</Label>
              <Input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Sort Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("created_at")}
              className="gap-2"
            >
              Date Created
              <ArrowUpDown className={`h-4 w-4 ${sortField === "created_at" ? "text-blue-600" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("client_name")}
              className="gap-2"
            >
              Customer Name
              <ArrowUpDown className={`h-4 w-4 ${sortField === "client_name" ? "text-blue-600" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading job tickets...</div>
        ) : !tickets?.length ? (
          <div className="text-center py-4">No job tickets found</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowTicketForm(true);
                }}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{ticket.ticket_number}</h3>
                    {ticket.client ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {ticket.client.first_name} {ticket.client.last_name}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1 italic">No client assigned</p>
                    )}
                    {ticket.vehicle && (
                      <p className="text-sm text-gray-500">
                        {ticket.vehicle.year} {ticket.vehicle.make} {ticket.vehicle.model}
                      </p>
                    )}
                    <p className="text-sm mt-2">{ticket.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                      ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'pending_parts' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-800">
                      Priority: {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
