
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket, TicketPriority, TicketStatus, TicketType } from "@/types/job-ticket";
import type { SortField, SortOrder } from "./use-job-ticket-filters";

export const useTicketData = (
  garageId: string | undefined,
  nameFilter: string,
  statusFilter: TicketStatus | "all",
  registrationFilter: string,
  priorityFilter: TicketPriority | "all",
  technicianFilter: string | "all",
  typeFilter: TicketType | "all",
  hideCompleted: boolean,
  sortField: SortField,
  sortOrder: SortOrder
) => {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets", nameFilter, statusFilter, registrationFilter, priorityFilter, technicianFilter, typeFilter, hideCompleted, sortField, sortOrder, garageId],
    queryFn: async () => {
      if (!garageId) {
        return [];
      }
      
      let query = supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('garage_id', garageId);
      
      // Only apply filter if it's not "all"
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as TicketStatus);
      }
      
      // Only apply filter if it's not "all"
      if (priorityFilter !== "all") {
        query = query.eq('priority', priorityFilter as TicketPriority);
      }
      
      // Only apply filter if it's not "all"
      if (technicianFilter !== "all") {
        query = query.eq('assigned_technician_id', technicianFilter);
      }
      
      // Only apply filter if it's not "all"
      if (typeFilter !== "all") {
        query = query.eq('ticket_type', typeFilter as TicketType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data as JobTicket[]).filter(ticket => {
        const matchesName = nameFilter 
          ? `${ticket.client?.first_name} ${ticket.client?.last_name}`.toLowerCase().includes(nameFilter.toLowerCase())
          : true;
        
        const matchesRegistration = registrationFilter
          ? ticket.vehicle?.license_plate?.toLowerCase().includes(registrationFilter.toLowerCase())
          : true;

        const isHidden = hideCompleted
          ? ticket.status === 'completed' || ticket.status === 'cancelled'
          : false;

        return matchesName && matchesRegistration && !isHidden;
      });

      filteredData.sort((a, b) => {
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

      return filteredData;
    },
    enabled: !!garageId,
  });
  
  return { tickets, isLoading };
};
