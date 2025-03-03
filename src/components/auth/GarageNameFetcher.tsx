
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
        
        // First try to get the garage by slug
        let { data, error } = await supabase
          .from('garages')
          .select('name')
          .eq('slug', effectiveGarageSlug)
          .maybeSingle();
        
        // If not found by slug, try by ID (in case the slug is actually a UUID)
        if (!data && !error) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveGarageSlug);
          
          if (isUuid) {
            console.log("Slug appears to be a UUID, trying to fetch by ID");
            ({ data, error } = await supabase
              .from('garages')
              .select('name')
              .eq('id', effectiveGarageSlug)
              .maybeSingle());
          }
        }
        
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
          onGarageNameChange(null); // Set to null instead of using slug as fallback
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
