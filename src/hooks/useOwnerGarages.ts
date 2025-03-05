
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

      // Use a more comprehensive query to find all garages associated with the user
      const allGarages: Garage[] = [];
      const seenGarageIds = new Set<string>();

      // First, check for garages the user owns directly (by owner_id)
      const { data: ownedGarages, error: ownedError } = await supabase
        .from("garages")
        .select("id, name, slug, address, email, phone, created_at, owner_id")
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

      // Second, check for garage memberships
      const { data: membershipRecords, error: membershipError } = await supabase
        .from("garage_members")
        .select("garage_id, role")
        .eq("user_id", userData.user.id);
      
      console.log("RAW MEMBERSHIPS:", JSON.stringify(membershipRecords));
      
      if (membershipError) {
        console.error("Error fetching garage memberships:", membershipError);
      } else if (membershipRecords && membershipRecords.length > 0) {
        console.log("Found garage memberships:", membershipRecords.length);
        
        // For each membership, get the garage details
        for (const membership of membershipRecords) {
          if (!seenGarageIds.has(membership.garage_id)) {
            const { data: garageData, error: garageError } = await supabase
              .from("garages")
              .select("id, name, slug, address, email, phone, created_at, owner_id")
              .eq("id", membership.garage_id)
              .single();
              
            if (garageError) {
              console.error("Error fetching garage details:", garageError);
            } else if (garageData) {
              allGarages.push(garageData);
              seenGarageIds.add(garageData.id);
              console.log("Added garage from membership:", garageData.id, garageData.name);
            }
          }
        }
      }

      // Third, check if the user's profile has a garage_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("garage_id")
        .eq("id", userData.user.id)
        .single();
      
      console.log("PROFILE DATA:", JSON.stringify(profileData));
        
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

      // Use a direct SQL query via RPC to check if there are any issues with RLS
      const { data: rawGarages } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT count(*) FROM garage_members 
          WHERE user_id = '${userData.user.id}'
        `
      });
      console.log("RAW COUNT OF MEMBERSHIPS:", rawGarages);

      // Additional direct query to see all garages
      const { data: allGaragesRaw } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT g.id, g.name, g.slug, gm.user_id, gm.role
          FROM garages g
          LEFT JOIN garage_members gm ON g.id = gm.garage_id
          WHERE gm.user_id = '${userData.user.id}'
          OR g.owner_id = '${userData.user.id}'
        `
      });
      console.log("ALL GARAGES DIRECT QUERY:", allGaragesRaw);

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
