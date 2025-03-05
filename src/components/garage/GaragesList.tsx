
import { Button } from "@/components/ui/button";
import { Plus, Settings, Download, Trash2 } from "lucide-react";
import type { Garage } from "@/types/garage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GaragesListProps {
  garages: Garage[];
  isLoading: boolean;
  onSelectGarage: (garageId: string) => void;
  onCreateGarage: () => void;
  onSettingsClick?: (garageId: string) => void;
  onExportData?: (garageId: string) => void;
  onDeleteClick?: (garageId: string) => void;
}

export const GaragesList = ({ 
  garages, 
  isLoading, 
  onSelectGarage, 
  onCreateGarage,
  onSettingsClick,
  onExportData,
  onDeleteClick
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
          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="p-6 relative">
            {onSettingsClick && (
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onExportData && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onExportData(garage.id);
                      }}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                      </DropdownMenuItem>
                    )}
                    {onDeleteClick && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(garage.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Garage
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div onClick={() => onSelectGarage(garage.id)} className="cursor-pointer">
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
