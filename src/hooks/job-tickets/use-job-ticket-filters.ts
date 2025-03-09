
import { useState, useCallback } from "react";
import type { TicketPriority, TicketStatus } from "@/types/job-ticket";
import { toast } from "sonner";

type SortField = "created_at" | "client_name";
type SortOrder = "asc" | "desc";

export const useJobTicketFilters = () => {
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [technicianFilter, setTechnicianFilter] = useState<string | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const resetAllFilters = useCallback(() => {
    setNameFilter("");
    setStatusFilter("all");
    setRegistrationFilter("");
    setPriorityFilter("all");
    setTechnicianFilter("all");
    setHideCompleted(false);
    setSortField("created_at");
    setSortOrder("desc");
    toast.success("All filters have been reset");
  }, []);

  return {
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
    hideCompleted,
    setHideCompleted,
    sortField,
    sortOrder,
    toggleSort,
    resetAllFilters
  };
};

export type { SortField, SortOrder };
