
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { JobTicketFilters } from "@/components/tickets/JobTicketFilters";
import { JobTicketsList } from "@/components/tickets/JobTicketsList";
import { JobTicketFormDialog } from "@/components/tickets/JobTicketFormDialog";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { useTheme } from "next-themes";
import { useJobTickets } from "@/hooks/use-job-tickets";
import { useEffect } from "react";

const JobTickets = () => {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('id');
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const {
    tickets,
    isLoading,
    selectedTicket,
    setSelectedTicket,
    showTicketForm,
    setShowTicketForm,
    nameFilter,
    setNameFilter,
    statusFilter,
    setStatusFilter,
    registrationFilter,
    setRegistrationFilter,
    priorityFilter,
    setPriorityFilter,
    technicianFilter,
    setTechnicianFilter,
    typeFilter,
    setTypeFilter,
    technicians,
    hideCompleted,
    setHideCompleted,
    sortField,
    sortOrder,
    toggleSort,
    fetchTicket,
    isLoadingTicket,
    linkedAppointmentId,
    resetAllFilters
  } = useJobTickets(ticketId);

  useEffect(() => {
    if (ticketId) {
      fetchTicket(ticketId);
    }
  }, [ticketId, fetchTicket]);

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="Job Tickets"
        description="Manage service job tickets"
        className={isDarkMode ? "bg-black" : ""}
      >
        <PageActionButton
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setSelectedTicket(null);
            setShowTicketForm(true);
          }}
        >
          New Job Ticket
        </PageActionButton>
      </PageHeader>

      <div className="px-8 pb-8">
        <JobTicketFilters
          nameFilter={nameFilter}
          statusFilter={statusFilter}
          registrationFilter={registrationFilter}
          priorityFilter={priorityFilter}
          typeFilter={typeFilter}
          technicianFilter={technicianFilter}
          technicians={technicians}
          hideCompleted={hideCompleted}
          sortField={sortField}
          sortOrder={sortOrder}
          onNameFilterChange={setNameFilter}
          onStatusFilterChange={setStatusFilter}
          onRegistrationFilterChange={setRegistrationFilter}
          onPriorityFilterChange={setPriorityFilter}
          onTypeFilterChange={setTypeFilter}
          onTechnicianFilterChange={setTechnicianFilter}
          onHideCompletedChange={setHideCompleted}
          onSortChange={toggleSort}
          onResetFilters={resetAllFilters}
        />

        <JobTicketsList
          tickets={tickets || []}
          isLoading={isLoading}
          onTicketClick={(ticket) => {
            setSelectedTicket(ticket);
            setShowTicketForm(true);
          }}
        />
      </div>

      <JobTicketFormDialog
        showTicketForm={showTicketForm}
        selectedTicket={selectedTicket}
        isLoading={isLoadingTicket}
        linkedAppointmentId={linkedAppointmentId}
        onOpenChange={(open) => {
          setShowTicketForm(open);
          if (!open) {
            setSelectedTicket(null);
            // Clear the URL parameter if dialog is closed
            window.history.pushState({}, '', '/dashboard/job-tickets');
          }
        }}
        onClose={() => {
          setShowTicketForm(false);
          setSelectedTicket(null);
          // Clear the URL parameter when closing the form
          window.history.pushState({}, '', '/dashboard/job-tickets');
        }}
      />
    </div>
  );
};

export default JobTickets;
