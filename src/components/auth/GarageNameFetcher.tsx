
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
    const fetchGarageName = async () => {
      try {
        if (!effectiveGarageSlug) {
          console.log("No garage slug provided");
          onGarageNameChange(null);
          return;
        }
        
        console.log(`Fetching name for garage slug: ${effectiveGarageSlug}`);
        
        const { data, error } = await supabase
          .from('garages')
          .select('name')
          .eq('slug', effectiveGarageSlug)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching garage name:", error);
          onGarageNameChange(null);
          return;
        }
        
        if (data) {
          console.log(`Found garage name: ${data.name}`);
          onGarageNameChange(data.name);
        } else {
          console.log("No garage found with that slug");
          onGarageNameChange(null);
        }
      } catch (error) {
        console.error("Error in garage name fetcher:", error);
        onGarageNameChange(null);
      }
    };
    
    fetchGarageName();
    
    // Clean up function to reset the name if component unmounts
    return () => {
      onGarageNameChange(null);
    };
  }, [effectiveGarageSlug, onGarageNameChange]);
  
  return null;
};
