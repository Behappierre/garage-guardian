
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketPriority } from "@/types/job-ticket";

interface JobTicketFiltersProps {
  nameFilter: string;
  dateFilter: string;
  registrationFilter: string;
  priorityFilter: TicketPriority | '';
  sortField: "created_at" | "client_name";
  sortOrder: "asc" | "desc";
  onNameFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onRegistrationFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: TicketPriority | '') => void;
  onSortChange: (field: "created_at" | "client_name") => void;
}

export const JobTicketFilters = ({
  nameFilter,
  dateFilter,
  registrationFilter,
  priorityFilter,
  sortField,
  sortOrder,
  onNameFilterChange,
  onDateFilterChange,
  onRegistrationFilterChange,
  onPriorityFilterChange,
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
          <Label htmlFor="priorityFilter">Filter by Priority</Label>
          <Select
            value={priorityFilter}
            onValueChange={(value) => onPriorityFilterChange(value as TicketPriority | '')}
          >
            <SelectTrigger id="priorityFilter">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {/* Empty string value is not allowed in SelectItem, using a space character instead */}
              <SelectItem value=" ">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateFilter">Filter by Date Created</Label>
          <Input
            id="dateFilter"
            type="date"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
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
    </div>
  );
};
