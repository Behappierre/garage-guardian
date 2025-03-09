
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus, TicketPriority } from "@/types/job-ticket";

interface StatusPrioritySelectorsProps {
  status: TicketStatus;
  priority: TicketPriority;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
}

export const StatusPrioritySelectors = ({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
}: StatusPrioritySelectorsProps) => {
  const handlePriorityChange = (value: any) => {
    console.log("Priority changed to:", value);
    onPriorityChange(value);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(value: any) => onStatusChange(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[180px]">
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_parts">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Priority</Label>
        <Select
          value={priority}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[180px]">
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
