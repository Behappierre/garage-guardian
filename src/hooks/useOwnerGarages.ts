
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
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const fetchOwnerGarages = useCallback(async () => {
    // Prevent multiple fetches while already loading
    if (isLoading && hasAttemptedFetch) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setHasAttemptedFetch(true);

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

      // DEBUGGING: Check raw database state
      const { data: ownerCheck } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT COUNT(*) FROM garages WHERE owner_id = '${userData.user.id}'::uuid`
      });
      console.log("DIRECT OWNER COUNT:", ownerCheck);

      const { data: memberCheck } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT COUNT(*) FROM garage_members WHERE user_id = '${userData.user.id}'::uuid`
      });
      console.log("DIRECT MEMBER COUNT:", memberCheck);

      const { data: profileCheck } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT garage_id FROM profiles WHERE id = '${userData.user.id}'::uuid`
      });
      console.log("DIRECT PROFILE GARAGE:", profileCheck);

      // Use a single SQL query with explicit UUID casting
      const { data: directResults } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT DISTINCT g.* FROM garages g
          LEFT JOIN garage_members gm ON g.id = gm.garage_id
          LEFT JOIN profiles p ON g.id = p.garage_id
          WHERE 
            g.owner_id = '${userData.user.id}'::uuid OR
            gm.user_id = '${userData.user.id}'::uuid OR
            (p.id = '${userData.user.id}'::uuid AND p.garage_id IS NOT NULL)
        `
      });
      
      console.log("DIRECT QUERY RESULTS:", JSON.stringify(directResults));
      
      if (directResults && Array.isArray(directResults) && directResults.length > 0) {
        console.log("Found garages for user:", directResults.length);
        // Cast the JSON results to Garage[] type
        setGarages(directResults as unknown as Garage[]);
      } else {
        console.log("No garages found for user");
        
        // Fallback check for a default "tractic" garage
        const { data: defaultGarage } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT * FROM garages WHERE slug = 'tractic' LIMIT 1`
        });
        
        console.log("Default garage check:", JSON.stringify(defaultGarage));
        
        if (defaultGarage && Array.isArray(defaultGarage) && defaultGarage.length > 0) {
          console.log("Using default 'tractic' garage");
          // Cast the JSON result to Garage[] type
          setGarages(defaultGarage as unknown as Garage[]);
          
          // Add user to this garage if not already a member
          try {
            await supabase.from('garage_members')
              .upsert([{ 
                user_id: userData.user.id, 
                garage_id: (defaultGarage[0] as unknown as Garage).id,
                role: 'member'
              }]);
              
            // Update profile
            await supabase.from('profiles')
              .update({ garage_id: (defaultGarage[0] as unknown as Garage).id })
              .eq('id', userData.user.id);
          } catch (err) {
            console.error("Error associating user with default garage:", err);
          }
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
  }, [isLoading, hasAttemptedFetch]);

  // Fetch garages only once on component mount
  useEffect(() => {
    if (!hasAttemptedFetch) {
      fetchOwnerGarages();
    }
  }, [fetchOwnerGarages, hasAttemptedFetch]);

  // Create a clean version of refreshGarages that resets the fetch state
  const refreshGarages = useCallback(async () => {
    setHasAttemptedFetch(false);
    await fetchOwnerGarages();
  }, [fetchOwnerGarages]);

  return {
    garages,
    isLoading,
    error,
    refreshGarages
  };
};
