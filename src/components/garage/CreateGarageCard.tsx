
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface CreateGarageCardProps {
  onClick: () => void;
}

export const CreateGarageCard = ({ onClick }: CreateGarageCardProps) => {
  return (
    <Card className="border-dashed border-2 hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Create New Garage</CardTitle>
        <CardDescription>Set up a new garage business</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="64" 
          height="64" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-gray-400"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant="outline"
          onClick={onClick}
        >
          Add New Garage
        </Button>
      </CardFooter>
    </Card>
  );
};
