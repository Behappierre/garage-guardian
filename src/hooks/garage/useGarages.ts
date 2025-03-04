
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Garage, GarageHookReturn } from "./types";
import { useTracticGarageHandling } from "./useTracticGarageHandling";
import { useUserGarageAccess } from "./useUserGarageAccess";

export const useGarages = (): GarageHookReturn => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  
  const MAX_ATTEMPTS = 3;
  
  const { handleTracticUserGarages } = useTracticGarageHandling();
  const { checkUserAccess } = useUserGarageAccess(setError, setGarages);

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
      
      const user = await checkUserAccess();
      
      if (!user) {
        console.log("No authenticated user found or access check failed");
        setGarages([]);
        setLoading(false);
        return null;
      }
      
      // Return the successful user for other operations
      return user;
    } catch (error: any) {
      console.error("Error fetching garages:", error.message);
      
      // Don't show error for administrators with no garages
      if (error.message === "No garages found for your account.") {
        console.log("Administrator has no garages yet - this is expected for new users");
        setError(null);
        setGarages([]);
      } else {
        setError("Failed to load your garages. Please try again later.");
        toast.error("Failed to load your garages");
        setGarages([]);
      }
      
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
