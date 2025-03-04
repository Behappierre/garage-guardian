
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
      
      // Get garage memberships from garage_members table
      const { data: membershipData, error: membershipError } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error("Error fetching garage memberships:", membershipError.message);
        
        // Check if user is a Tractic user
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        if (isTracticUser) {
          // Try to find the Tractic garage
          const { data: tracticGarageData, error: tracticGarageError } = await supabase
            .from('garages')
            .select('*')
            .or('name.ilike.tractic,slug.ilike.tractic')
            .limit(1);
            
          if (tracticGarageError) {
            console.error("Error fetching Tractic garage:", tracticGarageError.message);
            toast.error("Could not load Tractic garage");
            setGarages([]);
            setLoading(false);
            return user;
          }
          
          if (tracticGarageData && tracticGarageData.length > 0) {
            console.log("Found Tractic garage for user:", tracticGarageData[0]);
            
            // Try to add user as member
            const tracticGarageId = tracticGarageData[0].id;
            
            try {
              const { error: membershipInsertError } = await supabase
                .from('garage_members')
                .upsert({
                  user_id: user.id,
                  garage_id: tracticGarageId,
                  role: 'owner'
                });
                
              if (membershipInsertError) {
                console.error("Error adding user to Tractic garage:", membershipInsertError.message);
              } else {
                console.log("Added user to Tractic garage successfully");
              }
            } catch (err) {
              console.error("Exception when adding user as garage member:", err);
            }
            
            setGarages(tracticGarageData);
            setLoading(false);
            return user;
          }
        }
        
        toast.error("Could not load garages");
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      if (!membershipData || membershipData.length === 0) {
        // No garage memberships found, check for Tractic garage for specific emails
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        if (isTracticUser) {
          // Try to find the Tractic garage
          const { data: tracticGarageData, error: tracticGarageError } = await supabase
            .from('garages')
            .select('*')
            .or('name.ilike.tractic,slug.ilike.tractic')
            .limit(1);
            
          if (tracticGarageError) {
            console.error("Error fetching Tractic garage:", tracticGarageError.message);
            toast.error("Could not load Tractic garage");
            setGarages([]);
            setLoading(false);
            return user;
          }
          
          if (tracticGarageData && tracticGarageData.length > 0) {
            console.log("Found Tractic garage for user with no memberships:", tracticGarageData[0]);
            
            // Try to add user as member
            const tracticGarageId = tracticGarageData[0].id;
            
            try {
              const { error: membershipInsertError } = await supabase
                .from('garage_members')
                .upsert({
                  user_id: user.id,
                  garage_id: tracticGarageId,
                  role: 'owner'
                });
                
              if (membershipInsertError) {
                console.error("Error adding user to Tractic garage:", membershipInsertError.message);
              } else {
                console.log("Added user to Tractic garage successfully");
              }
            } catch (err) {
              console.error("Exception when adding user as garage member:", err);
            }
            
            setGarages(tracticGarageData);
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
      
      // Get array of garage IDs from the results
      const garageIds = membershipData.map(item => item.garage_id);
      
      if (garageIds.length === 0) {
        console.error("No garage IDs found in membership data");
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      // Fetch garages using the IDs
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .in('id', garageIds);
        
      if (garageError) {
        console.error("Error fetching garages:", garageError.message);
        toast.error("Could not load garages");
        setGarages([]);
        setLoading(false);
        return user;
      }
      
      console.log("Fetched garages:", garageData);
      
      if (garageData && Array.isArray(garageData)) {
        setGarages(garageData);
      } else {
        console.error("Garage data is not an array:", garageData);
        toast.error("Could not load garages properly");
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
