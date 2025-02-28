
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientSelectorProps {
  clientId: string | null;
  clients?: { id: string; first_name: string; last_name: string }[];
  onClientChange: (clientId: string) => void;
}

export const ClientSelector = ({
  clientId,
  clients,
  onClientChange,
}: ClientSelectorProps) => {
  return (
    <div>
      <Label>Client</Label>
      <Select
        value={clientId || ""}
        onValueChange={(value) => onClientChange(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select client" />
        </SelectTrigger>
        <SelectContent>
          {clients?.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
