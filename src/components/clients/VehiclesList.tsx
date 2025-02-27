
import { Car, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Updated to match the Vehicle interface in Clients.tsx
interface Vehicle {
  id: string;
  client_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  vin: string | null;
  created_at: string;
  updated_at: string;
}

interface VehiclesListProps {
  vehicles: Vehicle[] | undefined;
  onAddVehicle: () => void;
}

export const VehiclesList = ({ vehicles, onAddVehicle }: VehiclesListProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
        <Button variant="outline" size="sm" onClick={onAddVehicle} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>
      
      <div className="p-6">
        {vehicles && vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center">
                  <Car className="h-5 w-5 text-gray-500 mr-2" />
                  <h4 className="font-medium text-gray-900">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  {vehicle.license_plate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">License Plate:</span>
                      <Badge variant="outline" className="font-mono">
                        {vehicle.license_plate}
                      </Badge>
                    </div>
                  )}
                  {vehicle.vin && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">VIN:</span>
                      <span className="text-sm font-mono">{vehicle.vin}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 mb-1">No vehicles added</h3>
            <p className="text-sm text-gray-400 mb-4">Add a vehicle to track maintenance and services</p>
            <Button variant="outline" size="sm" onClick={onAddVehicle}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Vehicle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
