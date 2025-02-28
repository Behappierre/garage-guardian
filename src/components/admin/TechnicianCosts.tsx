
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface TechnicianCost {
  id: string;
  technician_id: string;
  hourly_rate: number;
  first_name: string | null;
  last_name: string | null;
}

export const TechnicianCosts = () => {
  const queryClient = useQueryClient();
  const [editingTechnician, setEditingTechnician] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>("");

  const { data: technicianCosts, isLoading } = useQuery({
    queryKey: ["technician-costs"],
    queryFn: async () => {
      try {
        // First get all technicians (users with technician role)
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "technician");

        if (roleError) throw roleError;
        
        if (!roleData || roleData.length === 0) {
          return [];
        }

        const technicianIds = roleData.map(r => r.user_id);

        // Get profile info for all technicians
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", technicianIds);

        if (profilesError) throw profilesError;

        // Get existing hourly rates
        const { data: costs, error: costsError } = await supabase
          .from("technician_costs")
          .select("*");

        if (costsError) throw costsError;

        // Merge the data
        const mergedData: TechnicianCost[] = profiles.map((profile: any) => {
          const cost = costs?.find((c: any) => c.technician_id === profile.id);
          return {
            id: cost?.id || "",
            technician_id: profile.id,
            hourly_rate: cost?.hourly_rate || 0,
            first_name: profile.first_name,
            last_name: profile.last_name,
          };
        });

        return mergedData;
      } catch (error) {
        console.error("Error fetching technician costs:", error);
        throw error;
      }
    },
  });

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

  if (isLoading) {
    return <div>Loading technician costs...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Technician Hourly Rates</h2>
      
      {(!technicianCosts || technicianCosts.length === 0) ? (
        <div className="text-center py-4">No technicians found</div>
      ) : (
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
      )}
    </div>
  );
};
