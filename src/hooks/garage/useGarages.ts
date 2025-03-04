
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Garage, GarageHookReturn } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { getUserGarageMemberships, getGaragesByIds } from "./utils";

export const useGarages = (): GarageHookReturn => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  
  const MAX_ATTEMPTS = 3;

  const fetchUserGarages = async () => {
    if (fetchAttempts >= MAX_ATTEMPTS) {
      console.error("Max fetch attempts reached, stopping");
      setError("Too many fetch attempts. Please refresh the page.");
      setLoading(false);
      return null;
    }

    try {
      console.log(`Fetching garages (attempt ${fetchAttempts + 1}/${MAX_ATTEMPTS})`);
      setLoading(true);
      setError(null);
      
      // Check if user is logged in
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error fetching user:", userError.message);
        throw userError;
      }
      
      if (!user) {
        console.log("No authenticated user found");
        setGarages([]);
        setLoading(false);
        return null;
      }
      
      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (roleError) {
        console.error("Error fetching user role:", roleError.message);
        throw new Error("Could not verify your account role");
      }
      
      console.log("User role:", roleData?.role);
      
      // If the user is not an administrator, they shouldn't be accessing garages management
      if (roleData?.role !== 'administrator') {
        console.log("User is not an administrator, blocking access");
        setError("You don't have permission to access garage management");
        setGarages([]);
        setLoading(false);
        return null;
      }
      
      // Directly fetch garages where the user is the owner
      console.log("Fetching garages where user is owner");
      const { data: ownedGarages, error: ownedError } = await supabase
        .from('garages')
        .select('id, name, slug, address, created_at, owner_id')
        .eq('owner_id', user.id);
        
      if (ownedError) {
        console.error("Error fetching owned garages:", ownedError.message);
        throw new Error("Failed to load garages you own");
      }
      
      console.log("Owned garages:", ownedGarages);
      
      // If user has owned garages, use them
      if (ownedGarages && ownedGarages.length > 0) {
        setGarages(ownedGarages);
      } else {
        // As a fallback, try to get memberships
        const garageIds = await getUserGarageMemberships(user.id);
        
        if (garageIds.length > 0) {
          const userGarages = await getGaragesByIds(garageIds);
          setGarages(userGarages);
        } else {
          console.log("No garages found for user");
          setGarages([]);
        }
      }
      
      // Return the successful user for other operations
      return user;
    } catch (error: any) {
      console.error("Error fetching garages:", error.message);
      
      // Increment fetch attempts
      setFetchAttempts(prev => prev + 1);
      
      setError("Failed to load your garages. Please try again later.");
      toast.error("Failed to load your garages");
      setGarages([]);
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useGarages hook initialized");
    fetchUserGarages();
  }, []);

  return {
    garages,
    loading,
    error,
    refreshGarages: fetchUserGarages
  };
};
