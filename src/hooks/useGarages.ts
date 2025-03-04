
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
}

export const useGarages = () => {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserGarages = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setGarages([]);
        setLoading(false);
        return null;
      }
      
      console.log("Current user:", user.email);
      
      // Get the user's role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      if (roleError) {
        console.error("Error fetching user role:", roleError.message);
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      console.log("User role:", roleData?.role);
      
      // If the user is not an administrator, they shouldn't be accessing garages management
      if (roleData?.role !== 'administrator') {
        toast.error("You don't have permission to access garage management");
        await supabase.auth.signOut();
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      // Direct query to get garage_ids from garage_members table
      const { data: memberData, error: memberError } = await supabase
        .rpc('execute_read_only_query', {
          query_text: `SELECT garage_id FROM garage_members WHERE user_id = '${user.id}'`
        });
      
      if (memberError) {
        console.error("Error fetching garage memberships:", memberError.message);
        
        // Fallback to try fetching the Tractic garage directly
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        if (isTracticUser) {
          // Direct query to get the Tractic garage
          const { data: tracticData, error: tracticError } = await supabase
            .rpc('execute_read_only_query', {
              query_text: `SELECT * FROM garages WHERE LOWER(name) = 'tractic' OR LOWER(slug) = 'tractic' LIMIT 1`
            });
            
          if (!tracticError && tracticData && Array.isArray(tracticData) && tracticData.length > 0) {
            console.log("Found Tractic garage for user:", tracticData[0]);
            // Properly cast the Json[] to Garage[]
            const garageData = tracticData as unknown as Garage[];
            setGarages(garageData);
            setLoading(false);
            return user;
          }
        }
        
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      if (!memberData || !Array.isArray(memberData) || memberData.length === 0) {
        // No garage memberships found, check for Tractic garage for specific emails
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        if (isTracticUser) {
          // Direct query to get the Tractic garage
          const { data: tracticData, error: tracticError } = await supabase
            .rpc('execute_read_only_query', {
              query_text: `SELECT * FROM garages WHERE LOWER(name) = 'tractic' OR LOWER(slug) = 'tractic' LIMIT 1`
            });
            
          if (!tracticError && tracticData && Array.isArray(tracticData) && tracticData.length > 0) {
            console.log("Found Tractic garage for user with no memberships:", tracticData[0]);
            
            // Safe type handling to access id property
            const garageData = tracticData as unknown as Garage[];
            const tracticGarageId = garageData[0]?.id;
            
            if (tracticGarageId) {
              // Try to add user as garage member using a direct query
              try {
                const { error: addMemberError } = await supabase
                  .rpc('execute_read_only_query', {
                    query_text: `
                      INSERT INTO garage_members (user_id, garage_id, role)
                      VALUES ('${user.id}', '${tracticGarageId}', 'owner')
                      ON CONFLICT (user_id, garage_id) DO NOTHING
                      RETURNING id
                    `
                  });
                  
                if (addMemberError) {
                  console.error("Error trying to add user as Tractic garage member:", addMemberError.message);
                } else {
                  console.log("Added user as Tractic garage member");
                }
              } catch (err) {
                console.error("Exception when adding user as garage member:", err);
              }
            }
            
            setGarages(garageData);
            setLoading(false);
            return user;
          }
        }
        
        // No garages found for this user
        console.log("No garages found for user");
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      // Get array of garage IDs from the result
      // Add type checking to ensure memberData is an array
      if (!Array.isArray(memberData)) {
        console.error("memberData is not an array:", memberData);
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      // Properly handle property access with type safety
      const garageIds = memberData.map(item => {
        const typedItem = item as Record<string, any>;
        return typedItem.garage_id;
      });
      
      if (garageIds.length === 0) {
        console.error("No garage IDs found in memberData");
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      // Direct query to get garage details
      const { data: garageData, error: garageError } = await supabase
        .rpc('execute_read_only_query', {
          query_text: `SELECT * FROM garages WHERE id IN ('${garageIds.join("','")}')`
        });
        
      if (garageError) {
        console.error("Error fetching garages:", garageError.message);
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      console.log("Fetched garages:", garageData);
      
      // Ensure garageData is an array before setting state
      if (garageData && Array.isArray(garageData)) {
        // Properly cast the Json[] to Garage[]
        const typedGarages = garageData as unknown as Garage[];
        setGarages(typedGarages);
      } else {
        console.error("Garage data is not an array:", garageData);
        setGarages([]);
      }
      
      return user;
      
    } catch (error: any) {
      console.error("Error fetching garages:", error.message);
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
    refreshGarages: fetchUserGarages
  };
};
