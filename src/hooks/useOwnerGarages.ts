
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Garage {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  owner_id: string;
}

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

  const fetchOwnerGarages = async () => {
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

      // Fix: Use a different approach with aliases to avoid type issues
      const { data, error: garagesError } = await supabase
        .from("garages")
        .select("id, name, slug, address, email, phone, created_at, owner_id")
        .eq("owner_id", userData.user.id);

      if (garagesError) {
        throw new Error("Failed to fetch garages: " + garagesError.message);
      }

      setGarages(data || []);
    } catch (error: any) {
      console.error("Error in useOwnerGarages:", error);
      setError(error.message);
      toast.error("Failed to load your garages");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch garages on component mount
  useEffect(() => {
    fetchOwnerGarages();
  }, []);

  return {
    garages,
    isLoading,
    error,
    refreshGarages: fetchOwnerGarages
  };
};
