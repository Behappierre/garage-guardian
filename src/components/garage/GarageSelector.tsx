
import { useGarage } from "@/contexts/GarageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Check, ChevronDown, Warehouse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function GarageSelector() {
  const { currentGarage, userGarages, setCurrentGarage } = useGarage();
  const navigate = useNavigate();

  if (!currentGarage) {
    return (
      <Button 
        variant="outline" 
        onClick={() => navigate("/create-garage")}
        className="gap-1"
      >
        <PlusCircle className="h-4 w-4 mr-1" />
        Create Garage
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Warehouse className="h-4 w-4" />
          <span className="max-w-[120px] truncate">{currentGarage.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <div className="py-2 px-3 text-xs font-medium text-muted-foreground">
          Your Garages
        </div>
        {userGarages.map((garage) => (
          <DropdownMenuItem
            key={garage.id}
            onClick={() => setCurrentGarage(garage)}
            className={cn(
              "flex items-center justify-between",
              currentGarage.id === garage.id && "bg-accent"
            )}
          >
            <span className="truncate">{garage.name}</span>
            {currentGarage.id === garage.id && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
        <div className="py-2">
          <DropdownMenuItem 
            onClick={() => navigate("/create-garage")}
            className="flex items-center text-primary"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Garage
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
