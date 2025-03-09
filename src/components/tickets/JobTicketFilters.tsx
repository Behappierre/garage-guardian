
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ArrowUpDown, ToggleLeft, ToggleRight, User, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TicketPriority, TicketStatus } from "@/types/job-ticket";

interface JobTicketFiltersProps {
  nameFilter: string;
  statusFilter: TicketStatus | "all";
  registrationFilter: string;
  priorityFilter: TicketPriority | "all";
  hideCompleted: boolean;
  technicianFilter: string | "all";
  sortField: "created_at" | "client_name";
  sortOrder: "asc" | "desc";
  technicians: Array<{ id: string; first_name: string; last_name: string }>;
  onNameFilterChange: (value: string) => void;
  onStatusFilterChange: (value: TicketStatus | "all") => void;
  onRegistrationFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: TicketPriority | "all") => void;
  onHideCompletedChange: (value: boolean) => void;
  onTechnicianFilterChange: (value: string | "all") => void;
  onSortChange: (field: "created_at" | "client_name") => void;
  onResetFilters: () => void;
}

export const JobTicketFilters = ({
  nameFilter,
  statusFilter,
  registrationFilter,
  priorityFilter,
  hideCompleted,
  technicianFilter,
  sortField,
  sortOrder,
  technicians,
  onNameFilterChange,
  onStatusFilterChange,
  onRegistrationFilterChange,
  onPriorityFilterChange,
  onHideCompletedChange,
  onTechnicianFilterChange,
  onSortChange,
  onResetFilters,
}: JobTicketFiltersProps) => {
  // Get the sort direction icon for a field
  const getSortIcon = (field: "created_at" | "client_name") => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="space-y-2">
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as TicketStatus | "all")}
          >
            <SelectTrigger id="statusFilter">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_parts">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priorityFilter">Filter by Priority</Label>
          <Select
            value={priorityFilter}
            onValueChange={(value) => onPriorityFilterChange(value as TicketPriority | "all")}
          >
            <SelectTrigger id="priorityFilter">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="technicianFilter">Filter by Technician</Label>
          <Select
            value={technicianFilter}
            onValueChange={(value) => onTechnicianFilterChange(value)}
          >
            <SelectTrigger id="technicianFilter" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameFilter">Filter by Customer Name</Label>
          <Input
            id="nameFilter"
            placeholder="Enter customer name..."
            value={nameFilter}
            onChange={(e) => onNameFilterChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrationFilter">Filter by Registration</Label>
          <Input
            id="registrationFilter"
            placeholder="Enter vehicle registration..."
            value={registrationFilter}
            onChange={(e) => onRegistrationFilterChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => onSortChange("created_at")}
            className="gap-2"
          >
            Date Created {getSortIcon("created_at")}
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => onSortChange("client_name")}
            className="gap-2"
          >
            Customer Name {getSortIcon("client_name")}
          </Button>
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
        
        <div className="flex items-center space-x-2">
          <Switch
            id="hideCompleted"
            checked={hideCompleted}
            onCheckedChange={onHideCompletedChange}
          />
          <Label htmlFor="hideCompleted" className="cursor-pointer">
            Hide completed & cancelled tickets
          </Label>
          {hideCompleted ? (
            <ToggleRight className="h-5 w-5 text-blue-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
};
