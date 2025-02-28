
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ToggleLeft, ToggleRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TicketPriority, TicketStatus } from "@/types/job-ticket";

interface JobTicketFiltersProps {
  nameFilter: string;
  statusFilter: TicketStatus | "all";
  registrationFilter: string;
  priorityFilter: TicketPriority | "all";
  hideCompleted: boolean;
  sortField: "created_at" | "client_name";
  sortOrder: "asc" | "desc";
  onNameFilterChange: (value: string) => void;
  onStatusFilterChange: (value: TicketStatus | "all") => void;
  onRegistrationFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: TicketPriority | "all") => void;
  onHideCompletedChange: (value: boolean) => void;
  onSortChange: (field: "created_at" | "client_name") => void;
}

export const JobTicketFilters = ({
  nameFilter,
  statusFilter,
  registrationFilter,
  priorityFilter,
  hideCompleted,
  sortField,
  sortOrder,
  onNameFilterChange,
  onStatusFilterChange,
  onRegistrationFilterChange,
  onPriorityFilterChange,
  onHideCompletedChange,
  onSortChange,
}: JobTicketFiltersProps) => {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
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
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
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
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("created_at")}
            className="gap-2"
          >
            Date Created
            <ArrowUpDown className={`h-4 w-4 ${sortField === "created_at" ? "text-blue-600" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange("client_name")}
            className="gap-2"
          >
            Customer Name
            <ArrowUpDown className={`h-4 w-4 ${sortField === "client_name" ? "text-blue-600" : ""}`} />
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
