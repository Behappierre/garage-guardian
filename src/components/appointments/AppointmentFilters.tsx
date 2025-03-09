
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppointmentSortField, SortOrder, DateRangeFilter } from "@/types/appointment";
import { ChevronUp, ChevronDown, CalendarIcon, Filter, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface AppointmentFiltersProps {
  nameFilter: string;
  registrationFilter: string;
  statusFilter: string | "all";
  bayFilter: string | "all";
  dateRangeType: DateRangeFilter;
  dateRange?: DateRange;
  sortField: AppointmentSortField;
  sortOrder: SortOrder;
  onNameFilterChange: (value: string) => void;
  onRegistrationFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBayFilterChange: (value: string) => void;
  onDateRangeChange: (range?: DateRange) => void;
  onDateRangeTypeChange: (type: DateRangeFilter, customStart?: Date, customEnd?: Date) => void;
  onSortChange: (field: AppointmentSortField) => void;
  onResetFilters: () => void;
}

export const AppointmentFilters = ({
  nameFilter,
  registrationFilter,
  statusFilter,
  bayFilter,
  dateRangeType,
  dateRange,
  sortField,
  sortOrder,
  onNameFilterChange,
  onRegistrationFilterChange,
  onStatusFilterChange,
  onBayFilterChange,
  onDateRangeChange,
  onDateRangeTypeChange,
  onSortChange,
  onResetFilters,
}: AppointmentFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  // Set a data-test-id to help debug the date sorting button
  const renderSortButton = (field: AppointmentSortField, label: string) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        data-test-id={`sort-button-${field}`}
        onClick={() => {
          console.log(`Sort button clicked: ${field}`);
          onSortChange(field);
        }}
        className={`flex items-center gap-1 ${isActive ? 'font-semibold' : ''}`}
      >
        {label}
        {isActive && (
          sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex flex-wrap items-center gap-2">
          {renderSortButton("start_time", "Date")}
          {renderSortButton("client_name", "Client Name")}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 ml-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(nameFilter || registrationFilter || statusFilter !== "all" || bayFilter !== "all" || dateRangeType !== "all") && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs bg-primary text-primary-foreground rounded-full">
                {[
                  nameFilter,
                  registrationFilter,
                  statusFilter !== "all" ? 1 : null,
                  bayFilter !== "all" ? 1 : null,
                  dateRangeType !== "all" ? 1 : null
                ].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {(nameFilter || registrationFilter || statusFilter !== "all" || bayFilter !== "all" || dateRangeType !== "all") && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="flex items-center gap-1">
            <X className="w-4 h-4" />
            <span>Reset All Filters</span>
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-background border rounded-md">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name</label>
            <Input
              placeholder="Filter by client name"
              value={nameFilter}
              onChange={(e) => onNameFilterChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle Registration</label>
            <Input
              placeholder="Filter by registration"
              value={registrationFilter}
              onChange={(e) => onRegistrationFilterChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusFilterChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bay</label>
            <Select
              value={bayFilter}
              onValueChange={(value) => onBayFilterChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bays</SelectItem>
                <SelectItem value="bay1">Bay 1</SelectItem>
                <SelectItem value="bay2">Bay 2</SelectItem>
                <SelectItem value="mot">MOT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select
              value={dateRangeType}
              onValueChange={(value: DateRangeFilter) => onDateRangeTypeChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRangeType === "custom" && (
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium">Custom Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={onDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
