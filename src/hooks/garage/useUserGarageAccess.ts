
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "./types";
import { 
  isTracticUser, 
  getUserGarageMemberships, 
  getGaragesByIds,
  getUserRole 
} from "./utils";
import { useTracticGarageHandling } from "./useTracticGarageHandling";

export const useUserGarageAccess = (
  setError: (error: string | null) => void,
  setGarages: (garages: Garage[]) => void
) => {
  const { handleTracticUserGarages } = useTracticGarageHandling();

  const checkUserAccess = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error fetching user:", userError.message);
        throw userError;
      }
      
      if (!user) {
        console.log("No authenticated user found");
        setGarages([]);
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
          
          return user;
        } catch (err) {
          console.error("Error fetching Tractic user garages:", err);
          // Always fall back to default Tractic garage
          console.log("Falling back to default Tractic garage");
          // Don't set an error if we're going to fall back to a default garage
          setError(null);
          const tracticGarages = await handleTracticUserGarages(user);
          setGarages(tracticGarages);
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
          return user;
        }
        
        // If the user is not an administrator, they shouldn't be accessing garages management
        if (role !== 'administrator') {
          console.log("User is not an administrator, signing out");
          setError("You don't have permission to access garage management");
          await supabase.auth.signOut();
          setGarages([]);
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
    } catch (error) {
      console.error("User access check failed:", error);
      throw error;
    }
  };

  return { checkUserAccess };
};
