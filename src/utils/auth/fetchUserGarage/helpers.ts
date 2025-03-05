
/**
 * Checks if the current URL contains the source=staff parameter
 */
export const checkSourceParam = (): boolean => {
  return window.location.search.includes('source=staff');
};

/**
 * Verifies that a garage exists in the database
 */
export const verifyGarageExists = async (garageId: string): Promise<boolean> => {
  const { data: garageExists } = await supabase
    .from('garages')
    .select('id, name')
    .eq('id', garageId)
    .single();
    
  return !!garageExists;
};

/**
 * Imports supabase client
 */
import { supabase } from "@/integrations/supabase/client";
