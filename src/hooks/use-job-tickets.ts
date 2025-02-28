
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket, TicketPriority } from "@/types/job-ticket";

type SortField = "created_at" | "client_name";
type SortOrder = "asc" | "desc";

export const useJobTickets = (ticketId: string | null) => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(!!ticketId);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch specific ticket if ID is provided
  const { data: ticketData, isLoading: isLoadingTicket } = useQuery({
    queryKey: ['job_ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq('id', ticketId)
        .maybeSingle();
      
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
      const { data } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (data) {
        setSelectedTicket(data as JobTicket);
        setShowTicketForm(true);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    }
  }, []);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["job_tickets", nameFilter, dateFilter, registrationFilter, priorityFilter, sortField, sortOrder],
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
      
      // Only apply filter if it's not "all"
      if (priorityFilter !== "all") {
        query = query.eq('priority', priorityFilter);
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

  return {
    tickets,
    isLoading: isLoading || isLoadingTicket,
    selectedTicket,
    setSelectedTicket,
    showTicketForm,
    setShowTicketForm,
    nameFilter,
    setNameFilter,
    dateFilter,
    setDateFilter,
    registrationFilter,
    setRegistrationFilter,
    priorityFilter,
    setPriorityFilter,
    sortField,
    sortOrder,
    toggleSort,
    fetchTicket
  };
};

// Add missing import
import { useEffect } from "react";
