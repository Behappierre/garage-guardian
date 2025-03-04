
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
}

interface GarageCardProps {
  garage: Garage;
  onSelect: (garageId: string) => void;
}

export const GarageCard = ({ garage, onSelect }: GarageCardProps) => {
  return (
    <Card key={garage.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{garage.name}</CardTitle>
        <CardDescription>{garage.address || 'No address provided'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">Garage ID: {garage.slug}</p>
        <p className="text-sm text-gray-500">
          Created: {new Date(garage.created_at || '').toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onSelect(garage.id)}
        >
          Manage This Garage
        </Button>
      </CardFooter>
    </Card>
  );
};
