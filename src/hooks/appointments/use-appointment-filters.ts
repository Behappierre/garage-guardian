
import { useState, useCallback } from "react";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

export type AppointmentSortField = "start_time" | "client_name";
export type SortOrder = "asc" | "desc";
export type DateRangeFilter = "today" | "tomorrow" | "thisWeek" | "thisMonth" | "custom" | "all";

export const useAppointmentFilters = () => {
  // Filtering state
  const [nameFilter, setNameFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [bayFilter, setBayFilter] = useState<string | "all">("all");
  
  // Date range filtering
  const [dateRangeType, setDateRangeType] = useState<DateRangeFilter>("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<AppointmentSortField>("start_time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const toggleSort = (field: AppointmentSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const setDateRange = useCallback((rangeType: DateRangeFilter, customStart?: Date, customEnd?: Date) => {
    const today = new Date();
    
    switch (rangeType) {
      case "today":
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
        break;
      case "tomorrow":
        const tomorrow = addDays(today, 1);
        setStartDate(startOfDay(tomorrow));
        setEndDate(endOfDay(tomorrow));
        break;
      case "thisWeek":
        setStartDate(startOfWeek(today, { weekStartsOn: 1 })); // Week starts on Monday
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case "thisMonth":
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case "custom":
        if (customStart) setStartDate(startOfDay(customStart));
        if (customEnd) setEndDate(endOfDay(customEnd));
        break;
      case "all":
      default:
        setStartDate(null);
        setEndDate(null);
        break;
    }
    
    setDateRangeType(rangeType);
  }, []);

  const resetAllFilters = useCallback(() => {
    setNameFilter("");
    setRegistrationFilter("");
    setStatusFilter("all");
    setBayFilter("all");
    setDateRangeType("all");
    setStartDate(null);
    setEndDate(null);
    setSortField("start_time");
    setSortOrder("asc");
    toast.success("All filters have been reset");
  }, []);

  return {
    nameFilter,
    setNameFilter,
    registrationFilter,
    setRegistrationFilter,
    statusFilter,
    setStatusFilter,
    bayFilter,
    setBayFilter,
    dateRangeType,
    startDate,
    endDate,
    setDateRange,
    sortField,
    sortOrder,
    toggleSort,
    resetAllFilters
  };
};
