
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

  const { email, password, firstName, lastName, role } = body;
  
  // Log all received parameters for debugging
  console.log('Creating user with parameters:', { 
    email, 
    password: password ? '******' : undefined, 
    firstName, 
    lastName, 
    role,
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

  // For owner registration, garageId is not required initially
  if (role !== 'administrator' && !body.garageId) {
    console.error('No garage ID provided for non-admin user');
    const error = createErrorResponse('No garage ID provided. Please select a garage first.', 400);
    return { body: null, error };
  }

  console.log('Creating user with email:', email, 'role:', role);
  if (body.garageId) {
    console.log('User will be assigned to garage:', body.garageId);
  } else {
    console.log('No garage assignment (owner registration)');
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
  return { userData, error: null };
}

// Assign role and garage to the user
export async function assignUserRole(
  supabaseClient: SupabaseClient,
  userId: string,
  role: string,
  garageId: string | null
) {
  try {
    // Step 1: Insert role into user_roles with garage_id if provided
    const roleData: any = { 
      user_id: userId, 
      role
    };
    
    // Only add garage_id if it's provided
    if (garageId) {
      roleData.garage_id = garageId;
      console.log('Assigning role with garage_id:', roleData);
    } else {
      console.log('Assigning role without garage_id:', roleData);
    }
    
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert([roleData]);

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw new Error(`Error assigning role: ${roleError.message}`);
    }
    
    console.log('Successfully assigned role:', role);
    if (garageId) {
      console.log('With garage:', garageId);
    }

    // Step 2: Update profile with garage_id if provided
    if (garageId) {
      console.log('Updating profile with garage_id:', garageId);
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);

      if (profileError) {
        console.warn('Warning: Error updating profile with garage_id:', profileError);
        // Continue even if profile update fails
      } else {
        console.log('Successfully updated profile with garage_id:', garageId);
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
