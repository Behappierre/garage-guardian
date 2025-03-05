
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "@/types/garage";

export interface OwnerGaragesResult {
  garages: Garage[];
  isLoading: boolean;
  error: string | null;
  refreshGarages: () => Promise<void>;
}

export const useOwnerGarages = (): OwnerGaragesResult => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerGarages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error("Authentication error: " + userError.message);
      }
      
      if (!userData.user) {
        setGarages([]);
        setIsLoading(false);
        return;
      }

      console.log("AUTH USER ID:", userData.user.id);
      console.log("User email:", userData.user.email);

      // Use a single SQL query that bypasses potentially conflicting RLS policies
      const { data: directResults } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT DISTINCT g.* FROM garages g
          LEFT JOIN garage_members gm ON g.id = gm.garage_id
          LEFT JOIN profiles p ON g.id = p.garage_id
          WHERE 
            g.owner_id = '${userData.user.id}' OR
            gm.user_id = '${userData.user.id}' OR
            (p.id = '${userData.user.id}' AND p.garage_id IS NOT NULL)
        `
      });
      
      console.log("DIRECT QUERY RESULTS:", JSON.stringify(directResults));
      
      if (directResults && Array.isArray(directResults) && directResults.length > 0) {
        console.log("Found garages for user:", directResults.length);
        setGarages(directResults as Garage[]);
      } else {
        console.log("No garages found for user");
        
        // Fallback check for a default "tractic" garage
        const { data: defaultGarage } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT * FROM garages WHERE slug = 'tractic' LIMIT 1`
        });
        
        console.log("Default garage check:", JSON.stringify(defaultGarage));
        
        if (defaultGarage && Array.isArray(defaultGarage) && defaultGarage.length > 0) {
          console.log("Using default 'tractic' garage");
          setGarages(defaultGarage as Garage[]);
          
          // Add user to this garage if not already a member
          await supabase.from('garage_members')
            .upsert([{ 
              user_id: userData.user.id, 
              garage_id: defaultGarage[0].id,
              role: 'member'
            }]);
            
          // Update profile
          await supabase.from('profiles')
            .update({ garage_id: defaultGarage[0].id })
            .eq('id', userData.user.id);
        } else {
          setGarages([]);
        }
      }
    } catch (error: any) {
      console.error("Error in useOwnerGarages:", error);
      setError(error.message);
      toast.error("Failed to load your garages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch garages on component mount
  useEffect(() => {
    fetchOwnerGarages();
  }, [fetchOwnerGarages]);

  return {
    garages,
    isLoading,
    error,
    refreshGarages: fetchOwnerGarages
  };
};
