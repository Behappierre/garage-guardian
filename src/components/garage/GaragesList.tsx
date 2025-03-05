
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Garage } from "@/types/garage";

interface GaragesListProps {
  garages: Garage[];
  isLoading: boolean;
  onSelectGarage: (garageId: string) => void;
  onCreateGarage: () => void;
}

export const GaragesList = ({ 
  garages, 
  isLoading, 
  onSelectGarage, 
  onCreateGarage 
}: GaragesListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-6 h-48 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {garages.map((garage) => (
        <div 
          key={garage.id}
          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
          onClick={() => onSelectGarage(garage.id)}
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">{garage.name}</h3>
            <p className="text-gray-600 text-sm mb-4 truncate">
              {garage.address || "No address provided"}
            </p>
            <div className="text-sm text-gray-500">
              <p>{garage.email || "No email provided"}</p>
              <p>{garage.phone || "No phone provided"}</p>
            </div>
          </div>
        </div>
      ))}

      <div 
        className="bg-white rounded-lg overflow-hidden shadow-sm border border-dashed border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 h-full min-h-[200px]"
        onClick={onCreateGarage}
      >
        <div className="bg-green-50 rounded-full p-3 mb-4">
          <Plus className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Create New Garage</h3>
        <p className="text-gray-500 text-sm text-center mt-1">Add another business location</p>
      </div>
    </div>
  );
};
