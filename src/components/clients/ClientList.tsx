
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientCard } from "./ClientCard";
import { ClientListHeader } from "./ClientListHeader";
import { sortClients, SortField, SortDirection } from "./utils/sortingUtils";

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
  const sortedClients = sortClients(filteredClients, sortField, sortDirection);

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

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[calc(100vh-148px)]">
      <ClientListHeader 
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
      
      <div className="divide-y divide-gray-200 overflow-y-auto h-[calc(100vh-284px)]">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : sortedClients && sortedClients.length > 0 ? (
          sortedClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isSelected={selectedClient?.id === client.id}
              onClick={() => onSelectClient(client)}
            />
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
