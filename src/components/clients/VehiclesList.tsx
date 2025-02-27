
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Vehicle {
  id: string;
  client_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  color: string;
  notes: string;
}

interface VehiclesListProps {
  vehicles: Vehicle[] | undefined;
  onAddVehicle: () => void;
}

export const VehiclesList = ({ vehicles, onAddVehicle }: VehiclesListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
        <Button variant="outline" size="sm" onClick={onAddVehicle}>
          <Car className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {vehicles?.map((vehicle) => (
          <div key={vehicle.id} className="border rounded-lg p-4">
            <h4 className="font-medium">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h4>
            <p className="text-sm text-gray-500">
              License: {vehicle.license_plate || "No plate"}
            </p>
          </div>
        ))}
        {(!vehicles || vehicles.length === 0) && (
          <div className="col-span-2 text-gray-500">No vehicles added</div>
        )}
      </div>
    </div>
  );
};
