
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { TechnicianCost } from "./types";
import { useCurrency } from "@/hooks/use-currency";
import { useTechnicianCostMutation } from "./useTechnicianCostMutation";

interface TechnicianCostRowProps {
  cost: TechnicianCost;
}

export const TechnicianCostRow = ({ cost }: TechnicianCostRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const { currencySymbol } = useCurrency();
  const updateCostMutation = useTechnicianCostMutation();

  const handleEditClick = () => {
    setIsEditing(true);
    setHourlyRate(cost.hourly_rate.toString());
  };

  const handleSaveClick = () => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate)) {
      return;
    }
    updateCostMutation.mutate({ 
      technicianId: cost.technician_id, 
      rate 
    }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  return (
    <TableRow>
      <TableCell>
        {cost.first_name} {cost.last_name}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Label htmlFor={`rate-${cost.technician_id}`} className="sr-only">
              Hourly Rate
            </Label>
            <div className="flex items-center">
              <span className="mr-2">{currencySymbol}</span>
              <Input
                id={`rate-${cost.technician_id}`}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-24"
              />
            </div>
          </div>
        ) : (
          <span>{currencySymbol}{cost.hourly_rate.toFixed(2)}</span>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleSaveClick}
              disabled={updateCostMutation.isPending}
            >
              {updateCostMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleCancelClick}
              disabled={updateCostMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={handleEditClick}
          >
            Edit Rate
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
