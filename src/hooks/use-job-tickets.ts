
import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket, TicketPriority, TicketStatus } from "@/types/job-ticket";
import { toast } from "sonner";

type SortField = "created_at" | "client_name";
type SortOrder = "asc" | "desc";

export const useJobTickets = (ticketId: string | null) => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(!!ticketId);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // Fetch specific ticket if ID is provided
  const { data: ticketData, isLoading: isLoadingTicketQuery } = useQuery({
    queryKey: ['job_ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      const { data, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq('id', ticketId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching ticket:", error);
        return null;
      }
      
      return data as JobTicket | null;
    },
    enabled: !!ticketId,
  });

  // Update selected ticket when ticket data is loaded
  useEffect(() => {
    if (ticketData) {
      setSelectedTicket(ticketData);
      setShowTicketForm(true);
    }
  }, [ticketData]);

  const fetchTicket = useCallback(async (id: string) => {
    try {
      setIsLoadingTicket(true);
      
      const { data, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching ticket:", error);
        toast.error("Failed to load ticket details");
        return;
      }
      
      if (data) {
        setSelectedTicket(data as JobTicket);
        setShowTicketForm(true);
      } else {
        toast.error("Ticket not found");
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("An error occurred while loading the ticket");
    } finally {
      setIsLoadingTicket(false);
    }
  }, []);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets", nameFilter, statusFilter, registrationFilter, priorityFilter, hideCompleted, sortField, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("job_tickets")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `);
      
      // Only apply filter if it's not "all"
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      // Only apply filter if it's not "all"
      if (priorityFilter !== "all") {
        query = query.eq('priority', priorityFilter);
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
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

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
    hideCompleted,
    setHideCompleted,
    sortField,
    sortOrder,
    toggleSort,
    fetchTicket,
    isLoadingTicket: isLoadingTicket || isLoadingTicketQuery
  };
};
