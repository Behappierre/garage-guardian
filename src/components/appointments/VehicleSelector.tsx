
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

interface VehicleSelectorProps {
  clientId: string;
  value: string | null;
  onChange: (value: string) => void;
}

export const VehicleSelector = ({ clientId, value, onChange }: VehicleSelectorProps) => {
  const { garageId } = useAuth();
  
  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["vehicles", clientId, garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering vehicles");
        return [];
      }
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, year, license_plate")
        .eq("client_id", clientId)
        .eq("garage_id", garageId);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!clientId && !!garageId,
  });

  if (isLoading) return <div>Loading vehicles...</div>;
  if (error) return <div>Error loading vehicles: {error instanceof Error ? error.message : 'Unknown error'}</div>;

  return (
    <div className="space-y-2">
      <Label htmlFor="vehicle">Vehicle</Label>
      <Select onValueChange={onChange} value={value || ""}>
        <SelectTrigger id="vehicle">
          <SelectValue placeholder="Select a vehicle" />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                // Skip any vehicle with a null or empty ID
                if (!vehicle.id) return null;
                
                return (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.license_plate && `(${vehicle.license_plate})`}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-vehicles">No vehicles available</SelectItem>
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
};
