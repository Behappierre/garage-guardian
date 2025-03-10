
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
  vehicleId: string | null;
  vehicles?: {
    id: string;
    make: string;
    model: string;
    license_plate?: string;
  }[];
  onVehicleChange: (vehicleId: string) => void;
  isLoading?: boolean;
}

export const VehicleSelector = ({
  vehicleId,
  vehicles,
  onVehicleChange,
  isLoading = false,
}: VehicleSelectorProps) => {
  const { garageId } = useAuth();
  
  return (
    <div className="w-full">
      <Label>Vehicle</Label>
      <Select
        value={vehicleId || ""}
        onValueChange={(value) => {
          if (value && value !== "no-vehicles") {
            onVehicleChange(value);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading vehicles..." : "Select vehicle"} />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                // Skip any vehicle with a null or empty ID
                if (!vehicle.id) return null;
                
                return (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model}
                    {vehicle.license_plate && ` (${vehicle.license_plate})`}
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
