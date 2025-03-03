
import { supabase } from "@/integrations/supabase/client";
import { Garage, GarageFormData, GarageMember } from "@/types/garage";

export const garageService = {
  // Create a new garage
  async createGarage(
    garageData: GarageFormData,
    userId: string
  ): Promise<{ garage: Garage | null; error: Error | null }> {
    try {
      // Create garage entry
      const { data: garage, error: garageError } = await supabase
        .from("garages")
        .insert({
          name: garageData.name,
          slug: garageData.slug,
          address: garageData.address,
          phone: garageData.phone,
          email: garageData.email,
          logo_url: garageData.logo_url,
        })
        .select("*") as { data: Garage[] | null, error: Error | null };
      
      if (garageError) throw garageError;
      
      // Link user as garage owner
      const { error: adminError } = await supabase
        .from("garage_members")
        .insert({
          garage_id: garage?.[0]?.id,
          user_id: userId,
          role: "owner"
        });
      
      if (adminError) throw adminError;
      
      return { garage: garage?.[0] || null, error: null };
    } catch (error: any) {
      console.error("Error creating garage:", error);
      return { garage: null, error };
    }
  },
  
  // Get garages for the current user
  async getCurrentUserGarages(): Promise<{ garages: Garage[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { garages: [], error: new Error("User not authenticated") };
      }
      
      const { data: garageMembers, error: membersError } = await supabase
        .from("garage_members")
        .select("garage_id") as { data: {garage_id: string}[] | null, error: Error | null };
      
      if (membersError) throw membersError;
      
      if (!garageMembers?.length) {
        return { garages: [], error: null };
      }
      
      const garageIds = garageMembers.map(member => member.garage_id);
      
      const { data: garages, error: garagesError } = await supabase
        .from("garages")
        .select("*")
        .in("id", garageIds) as { data: Garage[] | null, error: Error | null };
      
      if (garagesError) throw garagesError;
      
      return { garages: garages || [], error: null };
    } catch (error: any) {
      console.error("Error fetching user garages:", error);
      return { garages: [], error };
    }
  },
  
  // Get a garage by slug
  async getGarageBySlug(slug: string): Promise<{ garage: Garage | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("garages")
        .select("*")
        .eq("slug", slug)
        .single() as { data: Garage | null, error: Error | null };
      
      if (error) throw error;
      
      return { garage: data, error: null };
    } catch (error: any) {
      console.error("Error fetching garage by slug:", error);
      return { garage: null, error };
    }
  },
  
  // Update garage details
  async updateGarage(garageId: string, updates: Partial<Garage>): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("garages")
        .update(updates)
        .eq("id", garageId);
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error("Error updating garage:", error);
      return { success: false, error };
    }
  },
  
  // Get all members of a garage
  async getGarageMembers(garageId: string): Promise<{ members: GarageMember[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("garage_members")
        .select(`
          *,
          profile:user_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq("garage_id", garageId) as { data: GarageMember[] | null, error: Error | null };
      
      if (error) throw error;
      
      return { members: data || [], error: null };
    } catch (error: any) {
      console.error("Error fetching garage members:", error);
      return { members: [], error };
    }
  },
  
  // Invite a user to a garage
  async inviteUser(
    garageId: string,
    email: string,
    role: GarageMember["role"]
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      // This would typically involve sending an invitation email
      // For now, we'll just create a record in the database
      
      // First, check if the user exists by email using listUsers and filtering
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        throw userError;
      }
      
      // Find user with matching email - explicitly specify the type for Supabase User objects
      const userWithEmail = users?.users?.find((u: { email?: string; id: string }) => u.email === email);
      
      if (userWithEmail) {
        // User exists, add them to the garage
        const { error: addError } = await supabase
          .from("garage_members")
          .insert({
            garage_id: garageId,
            user_id: userWithEmail.id,
            role
          });
        
        if (addError) throw addError;
      } else {
        // User doesn't exist
        // In a real app, you would create an invitation record and send an email
        throw new Error("User not found. Invitation system not implemented yet.");
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error("Error inviting user to garage:", error);
      return { success: false, error };
    }
  },
  
  // Remove a user from a garage
  async removeUser(garageId: string, userId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("garage_members")
        .delete()
        .eq("garage_id", garageId)
        .eq("user_id", userId);
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error("Error removing user from garage:", error);
      return { success: false, error };
    }
  }
};
