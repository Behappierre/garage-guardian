
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "@/types/garage";
import { getAccessibleGarages, repairUserGarageRelationships } from "@/utils/auth/garageAccess";

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

      console.log("Fetching garages for user:", userData.user.id);
      
      // Try to repair relationships first
      await repairUserGarageRelationships(userData.user.id);
      
      // Then fetch all accessible garages
      const accessibleGarages = await getAccessibleGarages(userData.user.id);
      
      console.log("Accessible garages:", accessibleGarages.length);
      
      if (accessibleGarages.length > 0) {
        setGarages(accessibleGarages);
      } else {
        console.log("No garages found, checking for default garage");
        
        // Simplified check for a default "tractic" garage
        try {
          const { data: defaultGarage } = await supabase
            .from('garages')
            .select('*')
            .eq('slug', 'tractic')
            .limit(1);
          
          console.log("Default garage check:", JSON.stringify(defaultGarage));
          
          if (defaultGarage && Array.isArray(defaultGarage) && defaultGarage.length > 0) {
            console.log("Using default 'tractic' garage");
            
            // Transform to expected Garage type
            const processedGarages = defaultGarage.map(garage => ({
              ...garage,
              relationship_type: 'member'
            })) as Garage[];
            
            setGarages(processedGarages);
            
            // Add user to this garage if not already a member
            try {
              await supabase.from('garage_members')
                .upsert([{ 
                  user_id: userData.user.id, 
                  garage_id: defaultGarage[0].id,
                  role: 'member'
                }], {
                  onConflict: 'user_id, garage_id'
                });
                
              // Update profile
              await supabase.from('profiles')
                .update({ garage_id: defaultGarage[0].id })
                .eq('id', userData.user.id);
            } catch (err) {
              console.error("Error associating user with default garage:", err);
            }
          } else {
            setGarages([]);
          }
        } catch (error) {
          console.error("Error fetching default garage:", error);
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
