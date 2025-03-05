
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

      console.log("Fetching garages for user:", userData.user.id);
      console.log("User email:", userData.user.email);

      // Use a more comprehensive query to find all garages associated with the user
      const allGarages: Garage[] = [];
      const seenGarageIds = new Set<string>();

      // First, check for garages the user owns directly (by owner_id)
      const { data: ownedGarages, error: ownedError } = await supabase
        .from("garages")
        .select("id, name, slug, address, email, phone, created_at, owner_id")
        .eq("owner_id", userData.user.id);
      
      if (ownedError) {
        console.error("Error fetching owned garages:", ownedError);
      } else if (ownedGarages && ownedGarages.length > 0) {
        console.log("Found owned garages:", ownedGarages.length);
        
        ownedGarages.forEach(garage => {
          allGarages.push(garage);
          seenGarageIds.add(garage.id);
        });
      }

      // Second, check for garage memberships
      const { data: memberships, error: memberError } = await supabase
        .from("garage_members")
        .select(`
          garage_id,
          role,
          garages:garage_id(id, name, slug, address, email, phone, created_at, owner_id)
        `)
        .eq("user_id", userData.user.id);
      
      if (memberError) {
        console.error("Error fetching garage memberships:", memberError);
      } else if (memberships && memberships.length > 0) {
        console.log("Found garage memberships:", memberships.length);
        
        memberships.forEach(membership => {
          if (membership.garages && !seenGarageIds.has(membership.garages.id)) {
            allGarages.push(membership.garages as Garage);
            seenGarageIds.add(membership.garages.id);
            console.log("Added garage from membership:", membership.garages.id, membership.garages.name);
          }
        });
      }

      // Third, check if the user's profile has a garage_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("garage_id")
        .eq("id", userData.user.id)
        .single();
        
      if (profileError && !profileError.message.includes("No rows found")) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData?.garage_id && !seenGarageIds.has(profileData.garage_id)) {
        // Fetch this garage's details
        const { data: profileGarage, error: profileGarageError } = await supabase
          .from("garages")
          .select("id, name, slug, address, email, phone, created_at, owner_id")
          .eq("id", profileData.garage_id)
          .single();
          
        if (profileGarageError) {
          console.error("Error fetching profile's garage:", profileGarageError);
        } else if (profileGarage) {
          allGarages.push(profileGarage);
          seenGarageIds.add(profileGarage.id);
          console.log("Added garage from profile:", profileGarage.id, profileGarage.name);
        }
      }

      console.log("Total garages found:", allGarages.length);
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
