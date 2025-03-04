
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "./types";
import { 
  findTracticGarage, 
  createTracticGarage, 
  addUserToGarage 
} from "./utils";

export const useTracticGarageHandling = () => {
  const handleTracticUserGarages = async (user: any): Promise<Garage[]> => {
    console.log("Handling garages for Tractic user:", user.email);
    
    try {
      // Try to find the Tractic garage
      let tracticGarage = await findTracticGarage();
      
      // If no Tractic garage found, create one
      if (!tracticGarage) {
        console.log("No Tractic garage found, creating one");
        tracticGarage = await createTracticGarage(user.email);
        if (!tracticGarage) {
          console.error("Failed to create Tractic garage");
          toast.error("Could not create Tractic garage");
          return [];
        }
      }
      
      console.log("Found or created Tractic garage:", tracticGarage);
      
      // Try to add user as member of the Tractic garage
      const memberAdded = await addUserToGarage(user.id, tracticGarage.id);
      if (!memberAdded) {
        console.warn(`Failed to add user ${user.id} to Tractic garage ${tracticGarage.id}`);
      }
      
      // Also update user's profile with the garage ID
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: tracticGarage.id })
        .eq('id', user.id);
        
      if (profileError) {
        console.warn(`Failed to update profile with garage ID: ${profileError.message}`);
      }
      
      return [tracticGarage];
    } catch (err) {
      console.error("Error in handleTracticUserGarages:", err);
      return [];
    }
  };

  return { handleTracticUserGarages };
};
