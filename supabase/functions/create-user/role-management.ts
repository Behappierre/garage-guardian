
import { ensureProfileExists } from './profile-management.ts';
import { corsHeaders } from './utils.ts';

export const assignUserRole = async (supabase: any, userId: string, role: string, garageId: string | null, userType: string) => {
  try {
    console.log(`Assigning role ${role} to user ${userId} for garage ${garageId || 'null'}`);
    
    // Verify userId exists and is valid before assigning roles
    const { data: userExists, error: userCheckError } = await supabase.auth.admin.getUserById(userId);
    
    if (userCheckError || !userExists || !userExists.user) {
      console.error('Error verifying user existence:', userCheckError || 'User not found');
      return {
        result: { 
          userId, 
          status: 'error', 
          message: 'Failed to verify user existence' 
        },
        error: userCheckError || new Error('User not found')
      };
    }
    
    // Double-check profile existence again in this function
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (!profileExists) {
      console.log('Profile not found in assignUserRole, creating it now');
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      
      if (userData && userData.user) {
        const firstName = userData.user.user_metadata?.first_name || '';
        const lastName = userData.user.user_metadata?.last_name || '';
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            garage_id: garageId
          });
          
        if (createProfileError) {
          console.error('Error creating profile during role assignment:', createProfileError);
        } else {
          console.log('Successfully created profile during role assignment');
        }
      }
    }
    
    // Check if user already has this role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();
      
    if (existingRoles) {
      console.log('User already has this role assigned');
    } else {
      // Insert role record
      console.log(`Inserting new role record: user_id=${userId}, role=${role}, garage_id=${garageId || 'null'}`);
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          garage_id: garageId
        });
        
      if (roleError) {
        console.error('Error assigning role:', roleError);
        return {
          result: { 
            userId, 
            status: 'warning', 
            message: 'User created but role assignment failed' 
          },
          error: roleError
        };
      }
      
      console.log('Role assigned successfully');
    }
    
    // For staff users, update profile with garage_id
    if (userType === 'staff' && garageId) {
      console.log(`Updating profile for staff user with garage_id: ${garageId}`);
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error('Error updating profile with garage_id:', profileUpdateError);
        // Continue anyway, not critical
      } else {
        console.log('Profile updated with garage_id successfully');
      }
    }
    
    // For owner type, ALWAYS add to garage_members regardless of garageId
    if (userType === 'owner') {
      console.log(`Adding owner to garage_members with or without garage: ${garageId || 'null'}`);
      
      // First check if user already has any membership record to prevent duplicates
      const { data: existingMembership } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();
        
      if (existingMembership) {
        console.log('User already has an owner membership record');
      } else {
        const { error: membershipError } = await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: garageId,  // This can be null initially
            role: 'owner'
          });
          
        if (membershipError) {
          console.error('Error adding owner to garage_members:', membershipError);
          // Continue anyway, not critical
        } else {
          console.log('Owner added to garage_members successfully with garage_id:', garageId || 'null');
        }
      }
    }
    
    return {
      result: { 
        userId, 
        status: 'success',
        message: 'User created and role assigned successfully' 
      },
      error: null
    };
  } catch (error: any) {
    console.error('Unexpected error assigning user role:', error);
    return {
      result: { 
        userId, 
        status: 'warning', 
        message: 'User created but role assignment failed due to unexpected error' 
      },
      error
    };
  }
};
