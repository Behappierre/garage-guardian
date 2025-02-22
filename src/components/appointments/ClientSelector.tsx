
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface ClientSelectorProps {
  clients?: Client[];
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
}

export const ClientSelector = ({ 
  clients = [], 
  selectedClientId, 
  onClientChange 
}: ClientSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="client">Client</Label>
      <select
        id="client"
        className="w-full border border-input rounded-md h-10 px-3"
        value={selectedClientId}
        onChange={(e) => onClientChange(e.target.value)}
        required
      >
        <option value="">Select a client</option>
        {clients?.map((client) => (
          <option key={client.id} value={client.id}>
            {client.first_name} {client.last_name}
          </option>
        ))}
      </select>
    </div>
  );
};
