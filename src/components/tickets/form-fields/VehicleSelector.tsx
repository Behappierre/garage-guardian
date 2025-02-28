
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleSelectorProps {
  vehicleId: string | null;
  vehicles?: { id: string; make: string; model: string; license_plate?: string }[];
  onVehicleChange: (vehicleId: string) => void;
}

export const VehicleSelector = ({
  vehicleId,
  vehicles,
  onVehicleChange,
}: VehicleSelectorProps) => {
  return (
    <div>
      <Label>Vehicle</Label>
      <Select
        value={vehicleId || ""}
        onValueChange={(value) => onVehicleChange(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles?.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model}
              {vehicle.license_plate ? ` (${vehicle.license_plate})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
