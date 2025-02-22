
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

interface VehicleSelectorProps {
  vehicles?: Vehicle[];
  selectedVehicleId: string | null;
  onVehicleChange: (vehicleId: string | null) => void;
}

export const VehicleSelector = ({
  vehicles = [],
  selectedVehicleId,
  onVehicleChange,
}: VehicleSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="vehicle">Vehicle</Label>
      <select
        id="vehicle"
        className="w-full border border-input rounded-md h-10 px-3"
        value={selectedVehicleId || ""}
        onChange={(e) => onVehicleChange(e.target.value || null)}
      >
        <option value="">Select a vehicle</option>
        {vehicles?.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.license_plate && ` (${vehicle.license_plate})`}
          </option>
        ))}
      </select>
    </div>
  );
};
