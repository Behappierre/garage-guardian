
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
            .maybeSingle();
          
          if (error) {
            console.error("Error fetching garage info:", error);
            onGarageNameChange(null);
          } else if (data) {
            console.log(`Found garage name: ${data.name}`);
            onGarageNameChange(data.name);
          } else {
            console.log("No garage found with that slug");
            onGarageNameChange(null);
          }
        } catch (error) {
          console.error("Error fetching garage info:", error);
          onGarageNameChange(null);
        }
      };
      
      fetchGarageName();
    } else {
      onGarageNameChange(null);
    }
  }, [effectiveGarageSlug, onGarageNameChange]);

  return null;
};
