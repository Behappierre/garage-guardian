
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TechnicianCost } from "./types";

interface TechnicianCostsTableProps {
  technicianCosts: TechnicianCost[];
}

export const TechnicianCostsTable = ({ technicianCosts }: TechnicianCostsTableProps) => {
  const queryClient = useQueryClient();
  const [editingTechnician, setEditingTechnician] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>("");

  const updateCostMutation = useMutation({
    mutationFn: async (variables: { technicianId: string; rate: number }) => {
      // Check if cost record already exists
      const { data: existingCost } = await supabase
        .from("technician_costs")
        .select("*")
        .eq("technician_id", variables.technicianId)
        .single();

      if (existingCost) {
        // Update existing record
        const { data, error } = await supabase
          .from("technician_costs")
          .update({ hourly_rate: variables.rate })
          .eq("technician_id", variables.technicianId);

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from("technician_costs")
          .insert([
            { technician_id: variables.technicianId, hourly_rate: variables.rate },
          ]);

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-costs"] });
      toast.success("Hourly rate updated successfully");
      setEditingTechnician(null);
      setHourlyRate("");
    },
    onError: (error: Error) => {
      toast.error(`Error updating hourly rate: ${error.message}`);
    },
  });

  const handleEditClick = (technicianId: string, currentRate: number) => {
    setEditingTechnician(technicianId);
    setHourlyRate(currentRate.toString());
  };

  const handleSaveClick = (technicianId: string) => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate)) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    updateCostMutation.mutate({ technicianId, rate });
  };

  if (!technicianCosts || technicianCosts.length === 0) {
    return <div className="text-center py-4">No technicians found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technician</TableHead>
          <TableHead>Hourly Rate</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {technicianCosts.map((cost) => (
          <TableRow key={cost.technician_id}>
            <TableCell>
              {cost.first_name} {cost.last_name}
            </TableCell>
            <TableCell>
              {editingTechnician === cost.technician_id ? (
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`rate-${cost.technician_id}`} className="sr-only">
                    Hourly Rate
                  </Label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
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
                <span>${cost.hourly_rate.toFixed(2)}</span>
              )}
            </TableCell>
            <TableCell>
              {editingTechnician === cost.technician_id ? (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSaveClick(cost.technician_id)}
                  >
                    Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setEditingTechnician(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => handleEditClick(cost.technician_id, cost.hourly_rate)}
                >
                  Edit Rate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
