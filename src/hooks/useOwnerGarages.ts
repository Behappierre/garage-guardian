
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "@/types/garage";
import { getAccessibleGarages, repairUserGarageRelationships } from "@/utils/auth/garage-access";

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
        // User has no garages, show empty state with no default garage
        setGarages([]);
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
