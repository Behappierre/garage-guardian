
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

      // Use a simpler approach - fetch all garages this user should have access to
      // This includes owned garages and memberships
      
      const allGarages: Garage[] = [];
      const seenGarageIds = new Set<string>();

      // First fetch owned garages directly - this is more reliable
      const { data: ownedGarages, error: ownedError } = await supabase
        .from("garages")
        .select("*")
        .eq("owner_id", userData.user.id);
      
      console.log("RAW OWNED GARAGES:", JSON.stringify(ownedGarages));
      
      if (ownedError) {
        console.error("Error fetching owned garages:", ownedError);
      } else if (ownedGarages && ownedGarages.length > 0) {
        console.log("Found owned garages:", ownedGarages.length);
        
        ownedGarages.forEach(garage => {
          allGarages.push(garage);
          seenGarageIds.add(garage.id);
        });
      }

      // Then fetch garage memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("garage_members")
        .select("garage_id")
        .eq("user_id", userData.user.id);
      
      console.log("RAW MEMBERSHIPS:", JSON.stringify(memberships));
      
      if (membershipError) {
        console.error("Error fetching garage memberships:", membershipError);
      } else if (memberships && memberships.length > 0) {
        // For each membership, fetch the garage details if we haven't seen it yet
        for (const membership of memberships) {
          if (!seenGarageIds.has(membership.garage_id)) {
            const { data: garage, error: garageError } = await supabase
              .from("garages")
              .select("*")
              .eq("id", membership.garage_id)
              .maybeSingle();
              
            if (garageError) {
              console.error("Error fetching garage details:", garageError);
            } else if (garage) {
              allGarages.push(garage);
              seenGarageIds.add(garage.id);
            }
          }
        }
      }

      // Use execute_read_only_query as a backup to fetch ALL garage data without RLS restrictions
      // This helps us diagnose if RLS is causing issues
      const { data: directQueryResult } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT g.* FROM garages g
          WHERE g.owner_id = '${userData.user.id}'
          OR g.id IN (
            SELECT garage_id FROM garage_members 
            WHERE user_id = '${userData.user.id}'
          )
        `
      });
      
      console.log("DIRECT QUERY GARAGES:", JSON.stringify(directQueryResult));
      
      // Properly handle the array result from the RPC function
      if (directQueryResult && Array.isArray(directQueryResult) && directQueryResult.length > 0) {
        directQueryResult.forEach((garage: any) => {
          if (!seenGarageIds.has(garage.id)) {
            allGarages.push(garage);
            seenGarageIds.add(garage.id);
          }
        });
      }

      console.log("FINAL GARAGES LIST:", JSON.stringify(allGarages));
      setGarages(allGarages);
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
