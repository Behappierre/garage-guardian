
import { corsHeaders, createErrorResponse } from './utils.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Validate the incoming request
export async function validateRequest(req: Request) {
  // Parse request body
  let body;
  try {
    body = await req.json();
    console.log('Request body:', JSON.stringify(body));
  } catch (e) {
    console.error('Error parsing request body:', e);
    const error = createErrorResponse('Invalid request body', 400);
    return { body: null, error };
  }

  const { email, password, firstName, lastName, role, userType } = body;
  
  // Log all received parameters for debugging
  console.log('Creating user with parameters:', { 
    email, 
    password: password ? '******' : undefined, 
    firstName, 
    lastName, 
    role,
    userType,
    garageId: body.garageId
  });
  
  // Validate required fields
  if (!email || !password || !firstName || !lastName || !role) {
    console.error('Missing required fields:', { 
      email: !!email, 
      password: !!password, 
      firstName: !!firstName, 
      lastName: !!lastName, 
      role: !!role 
    });
    
    const error = createErrorResponse('Missing required fields', 400);
    return { body: null, error };
  }

  // For owner user type, garageId should be null
  // For staff user type that isn't administrator, garageId is required
  if (userType !== 'owner' && role !== 'administrator' && body.garageId === undefined) {
    console.error('No garage ID provided for non-admin staff user');
    const error = createErrorResponse('No garage ID provided for staff user.', 400);
    return { body: null, error };
  }

  console.log('Creating user with email:', email, 'role:', role, 'userType:', userType);
  if (body.garageId && userType !== 'owner') {
    console.log('User will be assigned to garage:', body.garageId);
  } else {
    console.log('Owner registration or administrator: No garage assignment needed initially');
  }

  return { body, error: null };
}

// Create a new user account
export async function createUserAccount(
  supabaseClient: SupabaseClient,
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  try {
    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabaseClient.auth.admin.listUsers({
      filter: {
        email: email
      }
    });

    if (checkError) {
      console.error('Error checking existing users:', checkError);
      const error = createErrorResponse(checkError.message, 400);
      return { userData: null, error };
    }

    if (existingUsers && existingUsers.users.length > 0) {
      console.log('User with this email already exists:', email);
      // Return the existing user instead of an error
      return { 
        userData: { 
          user: existingUsers.users[0]
        }, 
        error: null,
        isExisting: true
      };
    }

    // Create the user with first_name and last_name in user_metadata
    // This is important for the trigger to create the profile
    const { data: userData, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      const error = createErrorResponse(createUserError.message, 400);
      return { userData: null, error };
    }

    if (!userData?.user) {
      console.error('User creation failed - no user data returned');
      const error = createErrorResponse('User creation failed - no user data returned', 500);
      return { userData: null, error };
    }

    console.log('User created successfully with ID:', userData.user.id);
    
    // ALWAYS create a profile manually to ensure it exists
    // Don't rely on the trigger which might be failing
    try {
      console.log('Creating profile for user:', userData.user.id);
      const { error: insertProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName
        });
        
      if (insertProfileError) {
        console.error('Error creating profile manually:', insertProfileError);
        // Create another attempt with just the ID if there was an error
        const { error: fallbackProfileError } = await supabaseClient
          .from('profiles')
          .insert({ id: userData.user.id });
          
        if (fallbackProfileError) {
          console.error('Fallback profile creation also failed:', fallbackProfileError);
        } else {
          console.log('Created basic profile via fallback mechanism');
        }
      } else {
        console.log('Profile created manually for user:', userData.user.id);
      }
    } catch (profileError) {
      console.error('Exception creating profile:', profileError);
    }
    
    return { userData, error: null, isExisting: false };
  } catch (err: any) {
    console.error('Unexpected error creating user:', err);
    const error = createErrorResponse(err.message || 'Failed to create user', 500);
    return { userData: null, error };
  }
}

// Assign role to the user
export async function assignUserRole(
  supabaseClient: SupabaseClient,
  userId: string,
  role: string,
  garageId: string | null,
  userType: string = 'staff' // Default to staff if not provided
) {
  try {
    console.log(`Starting assignUserRole for user ${userId}, role: ${role}, userType: ${userType}, garageId: ${garageId}`);
    
    // Check if user_roles already exists for this user to prevent duplicates
    const { data: existingRoles, error: checkRoleError } = await supabaseClient
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
      
    if (checkRoleError) {
      console.error('Error checking existing user roles:', checkRoleError);
    } else if (existingRoles && existingRoles.length > 0) {
      console.log('User already has roles assigned:', existingRoles);
      
      // Check if the user has the specific role we're trying to assign
      const hasRole = existingRoles.some(r => r.role === role);
      
      if (hasRole) {
        console.log(`User already has ${role} role, no need to create duplicate`);
      } else {
        console.log(`User has roles but not ${role}, adding it`);
        
        // Add the new role
        const { error: addRoleError } = await supabaseClient
          .from('user_roles')
          .insert([{ user_id: userId, role }]);
          
        if (addRoleError) {
          console.error(`Error adding ${role} role:`, addRoleError);
        } else {
          console.log(`Added ${role} role to user`);
        }
      }
      
      // If existing roles don't have a garage_id but one is provided, update it
      const needsGarageUpdate = existingRoles.some(r => r.role === role && !r.garage_id && garageId);
      
      if (needsGarageUpdate) {
        console.log(`Updating user_roles with garage_id ${garageId}`);
        
        const { error: updateGarageError } = await supabaseClient
          .from('user_roles')
          .update({ garage_id: garageId })
          .eq('user_id', userId)
          .eq('role', role);
          
        if (updateGarageError) {
          console.error('Error updating garage_id in user_roles:', updateGarageError);
        } else {
          console.log('Updated user_roles with garage_id');
        }
      }
      
      // Return success since we don't need to create duplicates
      return {
        result: { 
          message: 'User roles have been updated as needed',
          userId: userId,
          status: 'success' 
        },
        error: null
      };
    }
    
    // For all users: Create a user_roles entry with the appropriate role
    // For owner users, DO NOT include garage_id in user_roles
    const userRoleData: Record<string, any> = { 
      user_id: userId, 
      role
    };
    
    // Only include garage_id for staff members, not for owners
    if (userType !== 'owner' && garageId) {
      console.log(`Adding garage_id ${garageId} to user_roles for staff member`);
      userRoleData.garage_id = garageId;
    } else {
      console.log('Owner user - not adding garage_id to user_roles');
    }
    
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert([userRoleData]);

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return {
        result: { 
          message: 'User created but role assignment failed',
          userId: userId,
          error: roleError.message,
          status: 'partial_success' 
        },
        error: true
      };
    }
    
    console.log('Successfully assigned role in user_roles:', role);
    
    // Check if user already has a profile
    const { data: profileData, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single();
      
    if (profileCheckError) {
      console.log('User may not have a profile, creating one');
      
      // Try to get user data to extract first/last name
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
      
      if (userError) {
        console.error('Error fetching user data:', userError);
      } else if (userData) {
        // Create a profile for the user
        const first_name = userData.user.user_metadata?.first_name || 'User';
        const last_name = userData.user.user_metadata?.last_name || '';
        
        const { error: createProfileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            first_name,
            last_name,
            garage_id: garageId
          });
          
        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
        } else {
          console.log('Created profile for user');
        }
      }
    } else {
      console.log('User already has a profile');
      
      // Update the profile with garage_id if provided
      if (garageId) {
        const { error: updateProfileError } = await supabaseClient
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
          
        if (updateProfileError) {
          console.error('Error updating profile with garage_id:', updateProfileError);
        } else {
          console.log('Updated profile with garage_id');
        }
      }
    }
    
    // Determine garage_member role based on userType
    const memberRole = userType === 'owner' ? 'owner' : role;
    
    // Check if garage_members already exists for this user
    if (userType !== 'owner' && garageId) {
      const { data: existingMembers, error: checkMemberError } = await supabaseClient
        .from('garage_members')
        .select('*')
        .eq('user_id', userId)
        .eq('garage_id', garageId);
        
      if (checkMemberError) {
        console.error('Error checking existing garage members:', checkMemberError);
      } else if (existingMembers && existingMembers.length > 0) {
        console.log('User already a member of this garage, not creating duplicate');
        
        // Skip the rest of the garage_members logic
        return {
          result: { 
            message: 'User created and already a garage member',
            userId: userId,
            status: 'success' 
          },
          error: null
        };
      }
    }
    
    // For garage_members table
    const garageMemberData: Record<string, any> = {
      user_id: userId,
      role: memberRole
    };
    
    // Only include garage_id for staff members, not for owners
    // IMPORTANT: For owners, we DON'T add garage_id yet as they'll create a garage later
    if (userType !== 'owner' && garageId) {
      console.log(`Adding garage_id ${garageId} to garage_members for staff member`);
      garageMemberData.garage_id = garageId;
    } else {
      console.log('Owner user - not adding garage_id to garage_members');
      
      // IMPORTANT: For owners, we shouldn't create a garage_members entry yet
      // They will create their own garage and then be assigned as owner
      console.log('Skipping garage_members creation for owner - will be created when they create a garage');
      
      // Skip updating profile with garage_id for owners
      console.log('Owner user - not updating profile with garage_id');
      
      // Return success for owner users
      return {
        result: { 
          message: 'Owner user created successfully',
          userId: userId,
          status: 'success' 
        },
        error: null
      };
    }
    
    // Only create garage_members entry for staff users who have a garage_id
    if (userType !== 'owner' && garageId) {
      console.log(`Creating garage_members entry for staff with role: ${memberRole}`);
      console.log('Garage members data:', garageMemberData);
      
      const { error: memberError } = await supabaseClient
        .from('garage_members')
        .insert([garageMemberData]);
        
      if (memberError) {
        console.warn('Warning: Could not create garage_members entry:', memberError);
        // Continue even if this fails, but log the error
        return {
          result: { 
            message: 'User created with role, but garage_members entry failed',
            userId: userId,
            error: memberError.message,
            status: 'partial_success' 
          },
          error: true
        };
      } else {
        console.log(`Successfully created garage_members entry with role: ${memberRole}`);
      }
    }
    
    // If everything succeeded, return success response
    return {
      result: { 
        message: 'User created successfully',
        userId: userId,
        status: 'success' 
      },
      error: null
    };
  } catch (error: any) {
    console.error('Error in role assignment or profile update:', error);
    
    // Still return a success since user was created
    return {
      result: { 
        message: 'User created but role assignment had issues',
        userId: userId,
        error: error.message,
        status: 'partial_success' 
      },
      error: true // Indicate there was an error
    };
  }
}
