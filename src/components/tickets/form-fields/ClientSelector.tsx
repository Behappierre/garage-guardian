
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";

interface ClientSelectorProps {
  clientId: string | null;
  clients?: { id: string; first_name: string; last_name: string }[];
  onClientChange: (clientId: string) => void;
}

export const ClientSelector = ({
  clientId,
  clients: providedClients,
  onClientChange,
}: ClientSelectorProps) => {
  const { garageId } = useAuth();

  // If clients are not provided, fetch them by garage ID
  const { data: fetchedClients, isLoading } = useQuery({
    queryKey: ["clients-select", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering clients");
        return [];
      }
      
      console.log("Fetching clients for garage ID:", garageId);
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("garage_id", garageId)
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }

      console.log(`Retrieved ${data?.length || 0} clients for garage ${garageId}`);
      return data || [];
    },
    enabled: !providedClients && !!garageId,
  });

  // Use provided clients or fetched clients
  const clients = providedClients || fetchedClients;

  // Reset clientId if it's not in the available clients
  useEffect(() => {
    if (clientId && clients && clients.length > 0) {
      const clientExists = clients.some(client => client.id === clientId);
      if (!clientExists) {
        onClientChange("");
      }
    }
  }, [clients, clientId, onClientChange]);

  // Function to safely handle client selection
  const handleClientSelection = (value: string) => {
    if (value && value !== "no-clients") {
      onClientChange(value);
    }
  };

  return (
    <div>
      <Label>Client</Label>
      <Select
        value={clientId || ""}
        onValueChange={handleClientSelection}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading clients..." : "Select client"} />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {clients && clients.length > 0 ? (
              clients.map((client) => {
                // Skip any client with a null or empty ID
                if (!client.id) return null;
                
                return (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-clients">No clients available</SelectItem>
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
};
