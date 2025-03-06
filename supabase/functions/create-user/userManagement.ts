
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
      console.warn('User with this email already exists:', email);
      const error = createErrorResponse('A user with this email address has already been registered', 409);
      return { userData: null, error };
    }

    // Create the user
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
    
    // Check if profile was created by trigger
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData) {
      console.warn('Profile may not have been created by trigger, creating manually');
      
      // Manually create profile if trigger failed
      const { error: insertProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName
        });
        
      if (insertProfileError) {
        console.error('Error creating profile manually:', insertProfileError);
        // Continue anyway, as the user was created successfully
      } else {
        console.log('Profile created manually for user:', userData.user.id);
      }
    } else {
      console.log('Profile created by trigger for user:', userData.user.id);
    }
    
    return { userData, error: null };
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
      console.log('User already has roles assigned, not creating duplicates');
      
      // Return success since we don't need to create duplicates
      return {
        result: { 
          message: 'User already has roles assigned',
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
      
      // Only update profile with garage_id for staff users, not owners
      if (userType !== 'owner' && garageId) {
        // For users with a garage, update profile with garage_id
        console.log('Updating profile with garage_id:', garageId);
        
        // Update profile with garage_id if provided
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);

        if (profileError) {
          console.warn('Warning: Error updating profile with garage_id:', profileError);
          // Continue even if profile update fails
          return {
            result: { 
              message: 'User created with role, but profile update failed',
              userId: userId,
              error: profileError.message,
              status: 'partial_success' 
            },
            error: true
          };
        } else {
          console.log('Successfully updated profile with garage_id:', garageId);
        }
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
