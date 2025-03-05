
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/auth/useAuth";

interface ClientSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export const ClientSelector = ({ value, onChange }: ClientSelectorProps) => {
  const { garageId } = useAuth();
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering clients");
        return [];
      }
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("garage_id", garageId)
        .order("first_name");

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!garageId,
  });

  if (isLoading) return <div>Loading clients...</div>;
  if (error) return <div>Error loading clients: {error instanceof Error ? error.message : 'Unknown error'}</div>;

  return (
    <div className="space-y-2">
      <Label htmlFor="client">Client</Label>
      <Select onValueChange={onChange} value={value || ""}>
        <SelectTrigger id="client">
          <SelectValue placeholder="Select a client" />
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
