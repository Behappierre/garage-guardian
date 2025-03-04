
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
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleTracticUserGarages = async (user: any): Promise<Garage[]> => {
    console.log("Handling garages for Tractic user:", user.email);
    
    try {
      // Try to find the Tractic garage
      let tracticGarage = await findTracticGarage();
      
      // If no Tractic garage found, create one
      if (!tracticGarage) {
        console.log("No Tractic garage found, creating one");
        tracticGarage = await createTracticGarage(user.email);
        if (!tracticGarage) {
          console.error("Failed to create Tractic garage");
          toast.error("Could not create Tractic garage");
          return [];
        }
      }
      
      console.log("Found or created Tractic garage:", tracticGarage);
      
      // Try to add user as member of the Tractic garage
      const memberAdded = await addUserToGarage(user.id, tracticGarage.id);
      if (!memberAdded) {
        console.warn(`Failed to add user ${user.id} to Tractic garage ${tracticGarage.id}`);
      }
      
      return [tracticGarage];
    } catch (err) {
      console.error("Error in handleTracticUserGarages:", err);
      return [];
    }
  };

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
      
      // Get current user
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
      
      console.log("Current user:", user.email);
      
      // Special handling for Tractic users
      if (isTracticUser(user.email)) {
        console.log("Detected Tractic user, bypassing role check");
        
        try {
          // First try to get memberships directly
          const garageIds = await getUserGarageMemberships(user.id);
          console.log("Fetched garage IDs for Tractic user:", garageIds);
          
          if (garageIds.length === 0) {
            // No memberships found, set up default garage
            console.log("No garages found for Tractic user, setting up default garage");
            const tracticGarages = await handleTracticUserGarages(user);
            setGarages(tracticGarages);
            setLoading(false);
            return user;
          }
          
          // Fetch garages for the found memberships
          const userGarages = await getGaragesByIds(garageIds);
          console.log("User garages:", userGarages);
          
          if (userGarages.length === 0) {
            // If memberships exist but no garages found, handle as default case
            console.log("Membership exists but no garages found, creating default garage");
            // Clear the error as we're going to fall back to a default garage
            setError(null);
            const tracticGarages = await handleTracticUserGarages(user);
            setGarages(tracticGarages);
          } else {
            setGarages(userGarages);
          }
          
          setLoading(false);
          return user;
        } catch (err) {
          console.error("Error fetching Tractic user garages:", err);
          // Always fall back to default Tractic garage
          console.log("Falling back to default Tractic garage");
          // Don't set an error if we're going to fall back to a default garage
          setError(null);
          const tracticGarages = await handleTracticUserGarages(user);
          setGarages(tracticGarages);
          setLoading(false);
          return user;
        }
      }
      
      // For non-Tractic users, proceed with role checking
      try {
        // Get the user's role
        const role = await getUserRole(user.id);
        console.log("User role:", role);
        
        if (!role) {
          console.error("No role found for user");
          setError("Your account doesn't have a role assigned. Please contact an administrator.");
          setGarages([]);
          setLoading(false);
          return user;
        }
        
        // If the user is not an administrator, they shouldn't be accessing garages management
        if (role !== 'administrator') {
          console.log("User is not an administrator, signing out");
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
            console.log("No garages found for IDs");
            setError("Could not load garages. Please create a new garage.");
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
          console.log("Handling Tractic user specially after role check failure");
          // Don't set an error since we're falling back to a valid option
          setError(null);
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
      
      // Increment fetch attempts
      setFetchAttempts(prev => prev + 1);
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
