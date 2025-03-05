
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the user's profile with the provided garage ID
 */
export const updateUserProfileWithGarage = async (userId: string, garageId: string): Promise<void> => {
  await supabase
    .from('profiles')
    .update({ garage_id: garageId })
    .eq('id', userId);
};
