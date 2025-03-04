
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Garage, GarageHookReturn } from "./types";
import { supabase } from "@/integrations/supabase/client";

export const useGarages = (): GarageHookReturn => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchUserGarages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      if (!user) {
        setGarages([]);
        return null;
      }
      
      // Simplified and explicit query to avoid ambiguous column references
      // Specifically name the columns we want to select from the garages table
      const { data: ownedGarages, error: ownedError } = await supabase
        .from('garages')
        .select('id, name, slug, address, created_at, owner_id, email, phone')
        .eq('owner_id', user.id);
        
      if (ownedError) {
        throw new Error("Failed to load garages you own");
      }
      
      console.log("Owned garages:", ownedGarages);
      setGarages(ownedGarages || []);
      
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
