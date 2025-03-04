
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useGarageSelection = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const selectGarage = async (garageId: string) => {
    try {
      console.log("Selecting garage:", garageId);
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting user for garage selection:", userError.message);
        setDebugInfo(`User error: ${userError.message}`);
        throw userError;
      }
      
      if (!user) {
        console.log("No authenticated user found for garage selection");
        navigate("/auth?type=owner");
        return;
      }
      
      console.log("Updating user profile with selected garage");
      // Update user's profile with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', user.id);
        
      if (profileError) {
        console.error("Error updating profile with garage:", profileError.message);
        setDebugInfo(`Profile update error: ${profileError.message}`);
        throw profileError;
      }
      
      console.log("Successfully selected garage");
      toast.success("Garage selected successfully");
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error selecting garage:", error.message);
      setDebugInfo(`Garage selection error: ${error.message}`);
      toast.error("Failed to select garage");
    }
  };

  return {
    selectGarage,
    debugInfo
  };
};
