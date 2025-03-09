
import { useState, useEffect } from "react";
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { AppointmentSortField, SortOrder, DateRangeFilter } from "@/types/appointment";

export interface DateRange {
  from: Date;
  to?: Date;
}

export const useAppointmentFilters = () => {
  const [nameFilter, setNameFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [bayFilter, setBayFilter] = useState<string | "all">("all");
  
  // Date range filtering
  const [dateRangeType, setDateRangeType] = useState<DateRangeFilter>("all"); // Default to 'all' to show all dates
  const [startDate, setStartDate] = useState<Date | null>(null); 
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Sorting
  const [sortField, setSortField] = useState<AppointmentSortField>("start_time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Set date range based on type
  const setDateRange = (type: DateRangeFilter, customStart?: Date, customEnd?: Date) => {
    setDateRangeType(type);
    
    const today = new Date();
    
    switch (type) {
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
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
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
        // Set to null to not filter by date at all
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  // Toggle sort order or change sort field
  const toggleSort = (field: AppointmentSortField) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Change field and reset order to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Reset all filters to defaults
  const resetAllFilters = () => {
    setNameFilter("");
    setRegistrationFilter("");
    setStatusFilter("all");
    setBayFilter("all");
    setDateRange("all"); // Keep this as 'all' to show all appointments
    setSortField("start_time");
    setSortOrder("asc");
  };

  // Initialize with no date filter on mount
  useEffect(() => {
    // Do not set any default date filter
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
