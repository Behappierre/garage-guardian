
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpeningTime } from "./types";

export const useOpeningTimeMutation = (garageId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (openingTime: Partial<OpeningTime> & { day_of_week: number }) => {
      if (!garageId) throw new Error("No garage selected");

      const { day_of_week, ...updateData } = openingTime;
      
      // Try to find if this day already exists
      const { data: existingTime } = await supabase
        .from("opening_times")
        .select("id")
        .eq("opening_times.garage_id", garageId)
        .eq("day_of_week", day_of_week)
        .maybeSingle();

      if (existingTime) {
        // Update existing record - explicitly specify the table name for any ambiguous column
        const { data, error } = await supabase
          .from("opening_times")
          .update({ ...updateData })
          .eq("id", existingTime.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
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
      queryClient.invalidateQueries({ queryKey: ["opening-times", garageId] });
      toast.success("Opening times updated successfully");
    },
    onError: (error) => {
      console.error("Error updating opening times:", error);
      toast.error("Failed to update opening times");
    },
  });
};
