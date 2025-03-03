
import { GarageCard } from "./GarageCard";
import { type Garage } from "@/types/garage";

interface GarageGridProps {
  garages: Garage[];
}

export const GarageGrid = ({ garages }: GarageGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {garages.map((garage) => (
        <GarageCard key={garage.id} garage={garage} />
      ))}
    </div>
  );
};
