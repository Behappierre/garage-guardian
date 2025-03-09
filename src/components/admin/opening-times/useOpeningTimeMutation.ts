
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpeningTime } from "./types";
import { useAuth } from "@/hooks/auth/useAuth";

export const useOpeningTimeMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (openingTime: Partial<OpeningTime> & { day_of_week: number }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First, get the garage_id from user_roles table
      // Use .limit(1).single() instead of .maybeSingle() to get the first record
      // even if there are multiple matches
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("garage_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        throw roleError;
      }

      if (!roleData?.garage_id) {
        console.error("No garage found in user_roles for user:", user.id);
        throw new Error("No garage found in user_roles");
      }

      const garageId = roleData.garage_id;
      console.log("Updating opening time for garage from user_roles:", garageId, "day:", openingTime.day_of_week);
      
      const { day_of_week, ...updateData } = openingTime;
      
      // Try to find if this day already exists
      // Use regular eq without table prefixing
      const { data: existingTime } = await supabase
        .from("opening_times")
        .select("id")
        .eq("garage_id", garageId)
        .eq("day_of_week", day_of_week)
        .maybeSingle();

      if (existingTime) {
        console.log("Updating existing opening time:", existingTime.id);
        // Update existing record
        const { data, error } = await supabase
          .from("opening_times")
          .update({ ...updateData })
          .eq("id", existingTime.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        console.log("Creating new opening time for day:", day_of_week);
        // Insert new record - ensure all required fields are present
        const newRecord = {
          garage_id: garageId,
          day_of_week: day_of_week,
          start_time: updateData.start_time || "09:00:00",
          end_time: updateData.end_time || "17:00:00",
          is_closed: updateData.is_closed !== undefined ? updateData.is_closed : false
        };

        const { data, error } = await supabase
          .from("opening_times")
          .insert(newRecord)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-times", user?.id] });
      toast.success("Opening times updated successfully");
    },
    onError: (error) => {
      console.error("Error updating opening times:", error);
      toast.error("Failed to update opening times");
    },
  });
};
