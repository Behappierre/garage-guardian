
import { useNavigate } from "react-router-dom";
import { GarageForm } from "./GarageForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GarageFormContainerProps {
  userId: string;
  userType: "owner" | "staff";
  onComplete?: (garageId: string) => void;
}

export const GarageFormContainer = ({ 
  userId, 
  userType,
  onComplete 
}: GarageFormContainerProps) => {
  const navigate = useNavigate();
  
  // Define a safe callback wrapper to ensure onComplete is a function before calling it
  const handleComplete = async (garageId: string) => {
    if (typeof onComplete === 'function') {
      onComplete(garageId);
    } else {
      // Default behavior if onComplete is not provided
      toast.success("Garage created successfully!");
      
      try {
        // Verify the user's profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (profileError || !profile) {
          console.error("Profile may not exist, creating it");
          // Try to create profile if missing
          const { error: createError } = await supabase
            .from('profiles')
            .insert({ id: userId, garage_id: garageId });
            
          if (createError) {
            console.error("Failed to create profile:", createError);
          }
        }
        
        // Force refresh session
        await supabase.auth.refreshSession();
        
        // Route based on user type
        if (userType === "owner") {
          navigate('/garage-management');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error in completion handler:", error);
        // Fallback navigation even if there's an error
        navigate(userType === "owner" ? '/garage-management' : '/dashboard');
      }
    }
  };

  return <GarageForm userId={userId} onComplete={handleComplete} />;
};
