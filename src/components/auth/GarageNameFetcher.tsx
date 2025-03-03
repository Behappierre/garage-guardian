
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type GarageNameFetcherProps = {
  effectiveGarageSlug: string | null;
  onGarageNameChange: (name: string | null) => void;
};

export const GarageNameFetcher = ({ 
  effectiveGarageSlug, 
  onGarageNameChange 
}: GarageNameFetcherProps) => {
  
  useEffect(() => {
    // If a garage slug is provided, fetch the garage name
    if (effectiveGarageSlug) {
      const fetchGarageName = async () => {
        try {
          console.log(`Fetching name for garage slug: ${effectiveGarageSlug}`);
          const { data, error } = await supabase
            .from('garages')
            .select('name')
            .eq('slug', effectiveGarageSlug)
            .single();
          
          if (error) {
            console.error("Error fetching garage info:", error);
          } else if (data) {
            console.log(`Found garage name: ${data.name}`);
            onGarageNameChange(data.name);
          }
        } catch (error) {
          console.error("Error fetching garage info:", error);
        }
      };
      
      fetchGarageName();
    } else {
      onGarageNameChange(null);
    }
  }, [effectiveGarageSlug, onGarageNameChange]);

  return null;
};
