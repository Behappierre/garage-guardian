
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export async function selectGarage(garageId: string, navigate: ReturnType<typeof useNavigate>) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Unable to detect user for garage association");
      return;
    }
    
    console.log(`User ${userData.user.id} selecting garage ${garageId}`);
    
    // Update user_roles table
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userData.user.id);
      
    if (roleError) {
      console.error("Error updating user role:", roleError);
      toast.error("Failed to update your garage association");
      return;
    }
    
    // Update garage_members (ensure the user is a member of the selected garage)
    const { error: membershipError } = await supabase
      .from('garage_members')
      .upsert({
        user_id: userData.user.id,
        garage_id: garageId,
        role: 'owner'
      }, {
        onConflict: 'user_id,garage_id'
      });
      
    if (membershipError) {
      console.error("Error creating garage membership:", membershipError);
    }
    
    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userData.user.id);
      
    if (profileError) {
      console.error("Error updating profile:", profileError);
    }
    
    // Force a page reload to ensure context is updated with new garage_id
    toast.success("Successfully associated with garage");
    window.location.href = "/dashboard";
  } catch (error) {
    console.error("Error selecting garage:", error);
    toast.error("Failed to select garage");
  }
}
