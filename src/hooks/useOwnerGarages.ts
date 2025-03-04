
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

      // First, fetch garages that the user owns directly
      const { data: ownedGarages, error: ownedError } = await supabase
        .from("garages")
        .select("id, name, slug, address, email, phone, created_at, owner_id")
        .eq("owner_id", userData.user.id);
      
      if (ownedError) {
        console.error("Error fetching owned garages:", ownedError);
        throw new Error("Failed to fetch owned garages: " + ownedError.message);
      }

      // Second, fetch garages the user is a member of via garage_members table
      const { data: memberGarages, error: memberError } = await supabase
        .from("garage_members")
        .select(`
          garage_id,
          garages:garage_id(id, name, slug, address, email, phone, created_at, owner_id)
        `)
        .eq("user_id", userData.user.id);
      
      if (memberError) {
        console.error("Error fetching member garages:", memberError);
        throw new Error("Failed to fetch member garages: " + memberError.message);
      }

      // Third, check if the user has a garage_id in their profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("garage_id")
        .eq("id", userData.user.id)
        .single();
        
      if (profileError && !profileError.message.includes("No rows found")) {
        console.error("Error fetching profile:", profileError);
      }

      // Combine all garages, removing duplicates
      const allGarages: Garage[] = [...(ownedGarages || [])];

      // Add member garages if any (transform the nested structure)
      if (memberGarages && memberGarages.length > 0) {
        memberGarages.forEach(membership => {
          if (membership.garages && !allGarages.some(g => g.id === membership.garages.id)) {
            allGarages.push(membership.garages as Garage);
          }
        });
      }

      // Add profile garage if it exists and is not already included
      if (profileData?.garage_id && !allGarages.some(g => g.id === profileData.garage_id)) {
        const { data: profileGarage, error: profileGarageError } = await supabase
          .from("garages")
          .select("id, name, slug, address, email, phone, created_at, owner_id")
          .eq("id", profileData.garage_id)
          .single();
          
        if (!profileGarageError && profileGarage) {
          allGarages.push(profileGarage);
        } else if (profileGarageError && !profileGarageError.message.includes("No rows found")) {
          console.error("Error fetching profile garage:", profileGarageError);
        }
      }

      console.log("All garages fetched:", allGarages);
      setGarages(allGarages);
    } catch (error: any) {
      console.error("Error in useOwnerGarages:", error);
      setError(error.message);
      toast.error("Failed to load your garages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch garages on component mount only
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
