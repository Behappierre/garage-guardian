
import { useState } from "react";
import { 
  Search, 
  Calendar, 
  ArrowUpAZ, 
  ArrowDownAZ, 
  ArrowUp10, 
  ArrowDown10, 
  RefreshCw, 
  Filter 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange, DateRangePicker } from "@/components/ui/date-range-picker";
import type { AppointmentSortField, SortOrder, DateRangeFilter } from "@/hooks/appointments/use-appointment-filters";

interface AppointmentFiltersProps {
  nameFilter: string;
  registrationFilter: string;
  statusFilter: string | "all";
  bayFilter: string | "all";
  dateRangeType: DateRangeFilter;
  dateRange: DateRange | undefined;
  sortField: AppointmentSortField;
  sortOrder: SortOrder;
  onNameFilterChange: (value: string) => void;
  onRegistrationFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onBayFilterChange: (value: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onDateRangeTypeChange: (type: DateRangeFilter) => void;
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
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Get the sort direction icon for a field
  const getSortIcon = (field: AppointmentSortField) => {
    if (sortField !== field) {
      if (field === "client_name") {
        return <ArrowUpAZ className="h-4 w-4 text-gray-400" />;
      } else {
        return <ArrowUp10 className="h-4 w-4 text-gray-400" />;
      }
    }
    
    if (field === "client_name") {
      return sortOrder === "asc" 
        ? <ArrowUpAZ className="h-4 w-4 text-primary" />
        : <ArrowDownAZ className="h-4 w-4 text-primary" />;
    } else {
      return sortOrder === "asc"
        ? <ArrowUp10 className="h-4 w-4 text-primary" />
        : <ArrowDown10 className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("start_time")}
            className="gap-2"
          >
            Date {getSortIcon("start_time")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("client_name")}
            className="gap-2"
          >
            Client Name {getSortIcon("client_name")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {isFiltersExpanded ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResetFilters}
          className="gap-2 border-dashed"
        >
          Reset All Filters
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {isFiltersExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
          <div className="space-y-2">
            <Label htmlFor="nameFilter">Client Name</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="nameFilter"
                placeholder="Search by name..."
                value={nameFilter}
                onChange={(e) => onNameFilterChange(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="registrationFilter">Vehicle Registration</Label>
            <Input
              id="registrationFilter"
              placeholder="Enter registration..."
              value={registrationFilter}
              onChange={(e) => onRegistrationFilterChange(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="statusFilter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={onStatusFilterChange}
            >
              <SelectTrigger id="statusFilter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bayFilter">Bay</Label>
            <Select
              value={bayFilter}
              onValueChange={onBayFilterChange}
            >
              <SelectTrigger id="bayFilter">
                <SelectValue placeholder="Select bay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bays</SelectItem>
                <SelectItem value="bay1">Bay 1</SelectItem>
                <SelectItem value="bay2">Bay 2</SelectItem>
                <SelectItem value="mot">MOT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Select
                value={dateRangeType}
                onValueChange={(value) => onDateRangeTypeChange(value as DateRangeFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="thisWeek">This week</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRangeType === "custom" && (
                <DateRangePicker 
                  value={dateRange}
                  onChange={onDateRangeChange}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
