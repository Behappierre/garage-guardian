
import { Mail, Phone, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

type SortField = "first_name" | "last_name" | "created_at";
type SortDirection = "asc" | "desc";

export const ClientList = ({
  clients,
  isLoading,
  selectedClient,
  searchTerm,
  onSearchChange,
  onSelectClient,
}: ClientListProps) => {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch all vehicles for registration search
  const { data: vehicles } = useQuery({
    queryKey: ["all-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, client_id, license_plate");
      
      if (error) throw error;
      return data;
    }
  });

  // Get client IDs that match vehicle registration
  const clientIdsWithMatchingRegistration = searchTerm 
    ? vehicles?.filter(v => 
        v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(v => v.client_id)
    : [];

  // Filter clients based on search term
  const filteredClients = clients?.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check if this client has a vehicle with matching registration
    const hasMatchingVehicle = clientIdsWithMatchingRegistration?.includes(client.id);
    
    return (
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchTerm) ||
      hasMatchingVehicle
    );
  });

  // Sort filtered clients
  const sortedClients = filteredClients?.sort((a, b) => {
    if (sortField === "first_name") {
      return sortDirection === "asc" 
        ? a.first_name.localeCompare(b.first_name)
        : b.first_name.localeCompare(a.first_name);
    }
    if (sortField === "last_name") {
      return sortDirection === "asc" 
        ? a.last_name.localeCompare(b.last_name)
        : b.last_name.localeCompare(a.last_name);
    }
    // Default: sort by created_at
    return sortDirection === "asc" 
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Toggle sort direction or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Ensure selected client stays selected after updates
  useEffect(() => {
    if (selectedClient && clients) {
      const currentClient = clients.find(c => c.id === selectedClient.id);
      if (currentClient && JSON.stringify(currentClient) !== JSON.stringify(selectedClient)) {
        onSelectClient(currentClient);
      }
    }
  }, [clients, selectedClient, onSelectClient]);

  // Get the sort direction icon for a field
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === "asc" 
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[calc(100vh-148px)]">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Client List</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients or vehicle registrations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col space-y-2">
          <p className="text-sm text-gray-500">Sort by:</p>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => handleSort("first_name")}
            >
              First Name {getSortIcon("first_name")}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => handleSort("last_name")}
            >
              Last Name {getSortIcon("last_name")}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => handleSort("created_at")}
            >
              Date Added {getSortIcon("created_at")}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 overflow-y-auto h-[calc(100vh-284px)]">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : sortedClients && sortedClients.length > 0 ? (
          sortedClients.map((client) => (
            <div
              key={client.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedClient?.id === client.id ? "bg-primary/5 border-l-4 border-primary -ml-[4px]" : ""
              }`}
              onClick={() => onSelectClient(client)}
            >
              <h3 className="font-medium text-gray-900">
                {client.first_name} {client.last_name}
              </h3>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <Mail className="mr-2 h-4 w-4" />
                {client.email || "No email"}
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <Phone className="mr-2 h-4 w-4" />
                {client.phone || "No phone"}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "No clients found" : "No clients available"}
          </div>
        )}
      </div>
    </div>
  );
};
