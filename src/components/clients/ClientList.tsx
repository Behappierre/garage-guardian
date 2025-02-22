
import { Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
}

interface ClientListProps {
  clients: Client[] | undefined;
  isLoading: boolean;
  selectedClient: Client | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: Client) => void;
}

export const ClientList = ({
  clients,
  isLoading,
  selectedClient,
  searchTerm,
  onSearchChange,
  onSelectClient,
}: ClientListProps) => {
  const filteredClients = clients?.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  return (
    <div className="col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Client List</h2>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>
      <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : (
          filteredClients?.map((client) => (
            <div
              key={client.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                selectedClient?.id === client.id ? "bg-primary/5" : ""
              }`}
              onClick={() => onSelectClient(client)}
            >
              <h3 className="font-medium text-gray-900">
                {client.first_name} {client.last_name}
              </h3>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <Mail className="mr-2 h-4 w-4" />
                {client.email}
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <Phone className="mr-2 h-4 w-4" />
                {client.phone}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
