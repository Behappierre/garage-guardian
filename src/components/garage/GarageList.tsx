
import { useState } from "react";
import { GarageCard } from "./GarageCard";
import { CreateGarageCard } from "./CreateGarageCard";

interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
}

interface GarageListProps {
  garages: Garage[];
  loading: boolean;
  onSelectGarage: (garageId: string) => void;
  onCreateGarage: () => void;
}

export const GarageList = ({ 
  garages, 
  loading, 
  onSelectGarage, 
  onCreateGarage 
}: GarageListProps) => {
  if (loading) {
    return <div className="col-span-full text-center py-8">Loading your garages...</div>;
  }

  if (garages.length === 0) {
    return (
      <div className="col-span-full text-center py-8">
        <p className="mb-4">You don't have any garages yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {garages.map((garage) => (
        <GarageCard 
          key={garage.id} 
          garage={garage} 
          onSelect={onSelectGarage} 
        />
      ))}
      
      <CreateGarageCard onClick={onCreateGarage} />
    </div>
  );
};
