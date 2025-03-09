
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketType } from "@/types/job-ticket";
import { WrenchIcon, ClipboardListIcon } from "lucide-react";

interface TicketTypeSelectorProps {
  ticketType: TicketType;
  onTicketTypeChange: (ticketType: TicketType) => void;
}

export const TicketTypeSelector = ({
  ticketType,
  onTicketTypeChange,
}: TicketTypeSelectorProps) => {
  return (
    <div>
      <Label>Ticket Type</Label>
      <Select
        value={ticketType}
        onValueChange={(value: TicketType) => onTicketTypeChange(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[150px]">
          <SelectItem value="routine_service" className="flex items-center gap-2">
            <ClipboardListIcon className="h-4 w-4" />
            <span>Routine Service</span>
          </SelectItem>
          <SelectItem value="repair" className="flex items-center gap-2">
            <WrenchIcon className="h-4 w-4" />
            <span>Repair</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
