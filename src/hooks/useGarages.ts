
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      
      // First check if there's a direct entry for this user in the garage_members table
      const { data: memberData, error: memberError } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error("Error fetching garage memberships:", memberError.message);
        throw memberError;
      }
      
      console.log("Garage memberships found:", memberData);
      
      if (!memberData || memberData.length === 0) {
        // No memberships found, check for Tractic garage
        const { data: tracticData, error: tracticError } = await supabase
          .from('garages')
          .select('*')
          .or('name.ilike.tractic,slug.ilike.tractic')
          .limit(1);
          
        if (!tracticError && tracticData && tracticData.length > 0) {
          console.log("Found Tractic garage for user with no memberships:", tracticData[0]);
          
          // Add this user as a member of the Tractic garage if they have a tractic email
          // or if they're olivier@andre.org.uk
          if (user.email?.includes("tractic.co.uk") || user.email === "olivier@andre.org.uk") {
            const { error: addMemberError } = await supabase
              .from('garage_members')
              .upsert({ 
                user_id: user.id, 
                garage_id: tracticData[0].id, 
                role: 'owner' 
              });
              
            if (addMemberError) {
              console.error("Error adding user as Tractic garage member:", addMemberError.message);
            } else {
              console.log("Added user as Tractic garage member");
            }
          }
          
          setGarages(tracticData);
        } else {
          // No garages found for this user
          console.log("No garages found for user");
          setGarages([]);
        }
        setLoading(false);
        return user;
      }
      
      // Get the list of garage IDs
      const garageIds = memberData.map(item => item.garage_id);
      
      // Fetch the full garage details
      const { data, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .in('id', garageIds);
        
      if (garageError) {
        console.error("Error fetching garages:", garageError.message);
        throw garageError;
      }
      
      // Create a mutable copy of the garage data
      let garageData = data ? [...data] : [];
      
      // Check specifically for the Tractic garage
      const isTracticUser = user.email?.includes("tractic.co.uk") || user.email === "olivier@andre.org.uk";
      
      if (isTracticUser) {
        const tracticGarage = garageData.find(g => 
          g.name.toLowerCase() === "tractic" || 
          g.slug.toLowerCase() === "tractic"
        );
        
        if (!tracticGarage) {
          // Try to fetch it directly
          const { data: tracticData, error: tracticError } = await supabase
            .from('garages')
            .select('*')
            .or('name.ilike.tractic,slug.ilike.tractic')
            .limit(1);
            
          if (!tracticError && tracticData && tracticData.length > 0) {
            console.log("Found Tractic garage but user wasn't a member, adding manually:", tracticData[0]);
            
            // Add this user as a member of the Tractic garage
            const { error: addMemberError } = await supabase
              .from('garage_members')
              .upsert({ 
                user_id: user.id, 
                garage_id: tracticData[0].id, 
                role: 'owner' 
              });
              
            if (addMemberError) {
              console.error("Error adding user as Tractic garage member:", addMemberError.message);
            } else {
              console.log("Added user as Tractic garage member");
              
              // Add the Tractic garage to our list
              garageData.push(tracticData[0]);
            }
          }
        }
      }
      
      console.log("Fetched garages:", garageData);
      setGarages(garageData || []);
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
