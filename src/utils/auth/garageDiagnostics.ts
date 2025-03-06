
import { supabase } from "@/integrations/supabase/client";

/**
 * Logs any error during garage assignment
 */
export function logGarageAssignmentError(error: any, context: string) {
  console.error(`ERROR in ${context}:`, error);
}

/**
 * Run diagnostics on a user's garage assignment
 */
export async function runGarageDiagnostics(userId: string): Promise<boolean> {
  try {
    console.log('==========================================');
    console.log('Starting garage diagnostics for user:', userId);

    // Step 1: Check user_roles table
    console.log('CHECKING user_roles table...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error querying user_roles:', roleError);
      return false;
    }

    if (!roleData || roleData.length === 0) {
      console.error('⚠️ No roles found for user in user_roles table');
      
      // Try creating a default role
      console.log('Attempting to create default administrator role...');
      const { error: createRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'administrator'
        });
      
      if (createRoleError) {
        console.error('Failed to create default role:', createRoleError);
      } else {
        console.log('✅ Created default administrator role');
      }
    } else {
      console.log('✅ User roles found:', roleData);
    }

    // Step 2: Check profiles table
    console.log('CHECKING profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (profileError) {
      console.error('Error querying profiles:', profileError);
      return false;
    }

    if (!profileData || profileData.length === 0) {
      console.error('⚠️ No profile found for user');
      
      // Try getting user data to create profile
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('Cannot fetch user data to create profile:', userError);
      } else {
        console.log('Attempting to create profile from user data...');
        
        const firstName = userData.user.user_metadata?.first_name || 'User';
        const lastName = userData.user.user_metadata?.last_name || '';
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: firstName,
            last_name: lastName
          });
          
        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError);
        } else {
          console.log('✅ Created profile for user');
        }
      }
    } else {
      console.log('✅ User profile found:', profileData);
    }

    // Step 3: Check for garage assignments
    console.log('CHECKING garage assignments...');
    
    // Check for garage_id in role data
    const roleWithGarage = roleData?.find(r => r.garage_id !== null);
    
    if (roleWithGarage) {
      console.log('✅ User has garage_id in user_roles:', roleWithGarage.garage_id);
      
      // Check if the garage exists
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .eq('id', roleWithGarage.garage_id)
        .single();
        
      if (garageError || !garageData) {
        console.error('⚠️ Referenced garage does not exist:', roleWithGarage.garage_id);
      } else {
        console.log('✅ Referenced garage exists:', garageData.name);
      }
    } else {
      console.log('⚠️ User has no garage_id in user_roles');
    }
    
    // Check for garage_id in profile
    const profileWithGarage = profileData?.find(p => p.garage_id !== null);
    
    if (profileWithGarage) {
      console.log('✅ User has garage_id in profile:', profileWithGarage.garage_id);
      
      // Check if the garage exists
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .eq('id', profileWithGarage.garage_id)
        .single();
        
      if (garageError || !garageData) {
        console.error('⚠️ Referenced garage does not exist:', profileWithGarage.garage_id);
      } else {
        console.log('✅ Referenced garage exists:', garageData.name);
      }
      
      // If the role doesn't have a garage_id but profile does, update it
      if (!roleWithGarage && roleData && roleData.length > 0) {
        console.log('Updating user_roles with garage_id from profile...');
        
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ garage_id: profileWithGarage.garage_id })
          .eq('user_id', userId);
          
        if (updateRoleError) {
          console.error('Failed to update user_roles with garage_id:', updateRoleError);
        } else {
          console.log('✅ Updated user_roles with garage_id from profile');
        }
      }
    } else {
      console.log('⚠️ User has no garage_id in profile');
      
      // If the role has a garage_id but profile doesn't, update it
      if (roleWithGarage && profileData && profileData.length > 0) {
        console.log('Updating profile with garage_id from user_roles...');
        
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ garage_id: roleWithGarage.garage_id })
          .eq('id', userId);
          
        if (updateProfileError) {
          console.error('Failed to update profile with garage_id:', updateProfileError);
        } else {
          console.log('✅ Updated profile with garage_id from user_roles');
        }
      }
    }
    
    // Step 4: Check garage_members table
    console.log('CHECKING garage_members table...');
    
    const { data: memberData, error: memberError } = await supabase
      .from('garage_members')
      .select('*')
      .eq('user_id', userId);
      
    if (memberError) {
      console.error('Error querying garage_members:', memberError);
    } else if (!memberData || memberData.length === 0) {
      console.log('⚠️ User has no entries in garage_members table');
      
      // If profile or role has garage_id, add to garage_members
      const garageId = profileWithGarage?.garage_id || roleWithGarage?.garage_id;
      
      if (garageId) {
        console.log('Attempting to create garage_members entry...');
        
        // Find the user's role
        const userRole = roleData && roleData.length > 0 ? roleData[0].role : 'administrator';
        
        const { error: createMemberError } = await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: garageId,
            role: userRole === 'administrator' ? 'owner' : userRole
          });
          
        if (createMemberError) {
          console.error('Failed to create garage_members entry:', createMemberError);
        } else {
          console.log('✅ Created garage_members entry');
        }
      }
    } else {
      console.log('✅ User has entries in garage_members table:', memberData);
    }
    
    console.log('Diagnostics complete');
    console.log('==========================================');
    
    return true;
  } catch (error) {
    console.error('Error in runGarageDiagnostics:', error);
    return false;
  }
}
