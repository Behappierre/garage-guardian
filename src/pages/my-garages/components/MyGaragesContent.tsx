
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import { GarageGrid } from "./GarageGrid";
import { type Garage } from "@/types/garage";

interface MyGaragesContentProps {
  garages: Garage[];
  onNavigateToCreateGarage: () => void;
}

export const MyGaragesContent = ({ 
  garages, 
  onNavigateToCreateGarage 
}: MyGaragesContentProps) => {
  return (
    <main className="flex-grow container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Garages</h1>
        
        <p className="text-gray-600 mb-8">
          Select a garage to access its management dashboard. Each garage has its own isolated environment.
        </p>
        
        {garages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Garages Found</h3>
            <p className="text-gray-500 mb-6">You don't have any garages set up yet.</p>
            <Button onClick={onNavigateToCreateGarage}>
              Create a Garage
            </Button>
          </div>
        ) : (
          <GarageGrid garages={garages} />
        )}
        
        <div className="mt-8 text-center">
          <Button 
            variant="outline"
            onClick={onNavigateToCreateGarage}
          >
            Create Another Garage
          </Button>
        </div>
      </div>
    </main>
  );
};
