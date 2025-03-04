
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage, GarageHookReturn } from "./types";
import { 
  isTracticUser,
  findTracticGarage,
  createTracticGarage,
  addUserToGarage,
  getUserGarageMemberships,
  getGaragesByIds,
  getUserRole
} from "./useGarageUtils";

export const useGarages = (): GarageHookReturn => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTracticUserGarages = async (user: any): Promise<Garage[]> => {
    console.log("Handling garages for Tractic user:", user.email);
    
    // Try to find the Tractic garage
    let tracticGarage = await findTracticGarage();
    
    // If no Tractic garage found, create one
    if (!tracticGarage) {
      tracticGarage = await createTracticGarage(user.email);
      if (!tracticGarage) {
        toast.error("Could not create Tractic garage");
        return [];
      }
    }
    
    // Try to add user as member of the Tractic garage
    const memberAdded = await addUserToGarage(user.id, tracticGarage.id);
    if (!memberAdded) {
      console.warn(`Failed to add user ${user.id} to Tractic garage ${tracticGarage.id}`);
    }
    
    return [tracticGarage];
  };

  const fetchUserGarages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No authenticated user found");
        setGarages([]);
        setLoading(false);
        return null;
      }
      
      console.log("Current user:", user.email);
      
      // Special handling for Tractic users - skip role check
      if (isTracticUser(user.email)) {
        console.log("Detected Tractic user, bypassing role check");
        
        // Get garage memberships first
        const garageIds = await getUserGarageMemberships(user.id);
        console.log("Fetched garage IDs for Tractic user:", garageIds);
        
        if (garageIds.length === 0) {
          console.log("No garages found for Tractic user, setting up default garage");
          const tracticGarages = await handleTracticUserGarages(user);
          setGarages(tracticGarages);
          setLoading(false);
          return user;
        }
        
        // If user has memberships, fetch the garages
        const userGarages = await getGaragesByIds(garageIds);
        console.log("User garages:", userGarages);
        
        if (userGarages.length === 0) {
          setError("Could not load garages. Creating default garage.");
          const tracticGarages = await handleTracticUserGarages(user);
          setGarages(tracticGarages);
        } else {
          setGarages(userGarages);
        }
        
        setLoading(false);
        return user;
      }
      
      // For non-Tractic users, proceed with role checking
      try {
        // Get the user's role
        const role = await getUserRole(user.id);
        
        if (!role) {
          console.error("No role found for user");
          setError("Your account doesn't have a role assigned. Please contact an administrator.");
          setGarages([]);
          setLoading(false);
          return user;
        }
        
        console.log("User role:", role);
        
        // If the user is not an administrator, they shouldn't be accessing garages management
        if (role !== 'administrator') {
          toast.error("You don't have permission to access garage management");
          await supabase.auth.signOut();
          setGarages([]);
          setLoading(false);
          return user;
        }
        
        // Get garage memberships
        const garageIds = await getUserGarageMemberships(user.id);
        console.log("Fetched garage IDs:", garageIds);
        
        // If user has memberships, fetch the garages
        if (garageIds.length > 0) {
          console.log("Fetching garages for IDs:", garageIds);
          const userGarages = await getGaragesByIds(garageIds);
          console.log("User garages:", userGarages);
          
          if (userGarages.length === 0) {
            setError("Could not load garages. Using default garage.");
          } else {
            setGarages(userGarages);
          }
        } else {
          console.log("No garages found for user");
          setError("No garages found for your account.");
          setGarages([]);
        }
      } catch (error: any) {
        console.error("Error processing user role:", error.message);
        // For Tractic users, handle specially even if role check fails
        if (isTracticUser(user.email)) {
          const tracticGarages = await handleTracticUserGarages(user);
          setGarages(tracticGarages);
        } else {
          setError("Failed to verify your access role. Please try again later.");
          setGarages([]);
        }
      }
      
      return user;
      
    } catch (error: any) {
      console.error("Error fetching garages:", error.message);
      setError("Failed to load your garages. Please try again later.");
      toast.error("Failed to load your garages");
      setGarages([]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserGarages();
  }, []);

  return {
    garages,
    loading,
    error,
    refreshGarages: fetchUserGarages
  };
};
