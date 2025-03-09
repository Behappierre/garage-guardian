
import { corsHeaders } from './utils.ts';

export const validateRequest = async (req: Request) => {
  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role', 'userType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          body: null,
          error: new Response(
            JSON.stringify({ 
              error: `Missing required field: ${field}`,
              status: 'error'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        };
      }
    }
    
    return { body, error: null };
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {
      body: null,
      error: new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    };
  }
};

export const createUserAccount = async (supabase: any, email: string, password: string, firstName: string, lastName: string) => {
  try {
    console.log(`Attempting to create user with email: ${email}`);
    
    // Check if user already exists
    const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (getUserError) {
      console.error('Error checking if user exists:', getUserError);
      return {
        userData: null,
        error: new Response(
          JSON.stringify({ 
            error: getUserError.message,
            status: 'error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        ),
        isExisting: false
      };
    }
    
    // If user exists, return user
    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.log('User already exists:', existingUsers.users[0].id);
      
      // Ensure profile exists for existing user
      await ensureProfileExists(supabase, existingUsers.users[0].id, firstName, lastName);
      
      return {
        userData: { user: existingUsers.users[0] },
        error: null,
        isExisting: true
      };
    }
    
    // Create user if does not exist
    console.log('Creating new user...');
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });
    
    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return {
        userData: null,
        error: new Response(
          JSON.stringify({ 
            error: createUserError.message,
            status: 'error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        ),
        isExisting: false
      };
    }
    
    console.log('User created successfully:', userData.user.id);
    
    // CRITICAL: Create profile for the new user with multiple attempts if needed
    await ensureProfileExists(supabase, userData.user.id, firstName, lastName);
    
    return {
      userData,
      error: null,
      isExisting: false
    };
  } catch (error: any) {
    console.error('Unexpected error creating user account:', error);
    return {
      userData: null,
      error: new Response(
        JSON.stringify({ 
          error: error.message,
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      ),
      isExisting: false
    };
  }
};

// New helper function to ensure a profile exists with retry logic
async function ensureProfileExists(supabase: any, userId: string, firstName: string, lastName: string) {
  // First check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
    
  if (existingProfile) {
    console.log('Profile already exists for user:', userId);
    return;
  }
  
  console.log('Creating profile for user:', userId);
  
  // Try up to 3 times to create the profile
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: lastName
        });
        
      if (profileError) {
        console.error(`Profile creation attempt ${attempt} failed:`, profileError);
        if (attempt < 3) {
          console.log(`Waiting before retry ${attempt+1}...`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
        } else {
          console.error('All profile creation attempts failed for user:', userId);
        }
      } else {
        console.log('Profile created successfully for user:', userId);
        return; // Success, exit the function
      }
    } catch (error) {
      console.error(`Unexpected error in profile creation attempt ${attempt}:`, error);
      if (attempt >= 3) {
        console.error('All profile creation attempts failed with exceptions');
      }
    }
  }
}

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
    
    // For userType owner, add to garage_members ONLY if garageId is provided
    // We'll handle the initial membership entry differently
    if (userType === 'owner' && garageId) {
      console.log(`Adding owner to garage_members for garage: ${garageId}`);
      
      // First check if entry already exists to prevent duplicates
      const { data: existingMembership } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', garageId)
        .maybeSingle();
        
      if (existingMembership) {
        console.log('User already has membership for this garage');
      } else {
        const { error: membershipError } = await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: garageId,
            role: 'owner'
          });
          
        if (membershipError) {
          console.error('Error adding owner to garage_members:', membershipError);
          // Continue anyway, not critical
        } else {
          console.log('Owner added to garage_members successfully');
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
