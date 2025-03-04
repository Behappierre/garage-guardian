
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";

interface UpdateCostVariables {
  technicianId: string;
  rate: number;
}

export const useTechnicianCostMutation = () => {
  const queryClient = useQueryClient();
  const { garageId } = useAuth();

  return useMutation({
    mutationFn: async (variables: UpdateCostVariables) => {
      if (!garageId) {
        throw new Error("No garage ID available");
      }

      // Check if cost record already exists
      const { data: existingCost } = await supabase
        .from("technician_costs")
        .select("*")
        .eq("technician_id", variables.technicianId)
        .eq("garage_id", garageId)
        .single();

      if (existingCost) {
        // Update existing record
        const { data, error } = await supabase
          .from("technician_costs")
          .update({ hourly_rate: variables.rate })
          .eq("technician_id", variables.technicianId)
          .eq("garage_id", garageId);

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from("technician_costs")
          .insert([
            { 
              technician_id: variables.technicianId, 
              hourly_rate: variables.rate,
              garage_id: garageId 
            }
          ]);

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-costs"] });
      toast.success("Hourly rate updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error updating hourly rate: ${error.message}`);
    },
  });
};
