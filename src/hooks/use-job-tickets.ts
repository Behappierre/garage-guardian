
import { useAuth } from "@/components/auth/AuthProvider";
import { 
  useJobTicketFilters,
  useTicketData,
  useTechnicianData,
  useSingleTicket
} from "./job-tickets";

export const useJobTickets = (ticketId: string | null) => {
  const { garageId } = useAuth();
  
  // Get filter state and methods
  const {
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
    hideCompleted,
    setHideCompleted,
    sortField,
    sortOrder,
    toggleSort,
    resetAllFilters
  } = useJobTicketFilters();

  // Get technicians data
  const technicians = useTechnicianData(garageId);

  // Get filtered tickets data
  const { tickets, isLoading } = useTicketData(
    garageId,
    nameFilter,
    statusFilter,
    registrationFilter,
    priorityFilter,
    technicianFilter,
    typeFilter,
    hideCompleted,
    sortField,
    sortOrder
  );

  // Get single ticket handling
  const {
    selectedTicket,
    setSelectedTicket,
    showTicketForm,
    setShowTicketForm,
    isLoadingTicket,
    linkedAppointmentId,
    setLinkedAppointmentId,
    fetchTicket
  } = useSingleTicket(ticketId, garageId);

  return {
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
    setLinkedAppointmentId,
    resetAllFilters
  };
};
