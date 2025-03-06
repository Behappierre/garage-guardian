
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from './utils.ts';
import { validateRequest, createUserAccount, assignUserRole } from './userManagement.ts';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to create-user function');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse and validate request
    const { body, error: requestError } = await validateRequest(req);
    if (requestError) {
      return requestError;
    }

    const { email, password, firstName, lastName, role, garageId, userType } = body;
    
    console.log(`Creating user: ${email}, role: ${role}, userType: ${userType}, garageId: ${garageId || 'null'}`);
    
    // First check if user already exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers({
      filter: { email }
    });
    
    // If user already exists, proceed with role assignment instead of error
    if (existingUser?.users && existingUser.users.length > 0) {
      console.log(`User with email ${email} already exists, not creating again`);
      
      const userId = existingUser.users[0].id;
      
      // Check if profile exists for this user
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError || !profileData) {
        console.log(`Profile for user ${userId} does not exist, creating it`);
        
        // Create profile manually
        const { error: insertProfileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            first_name: firstName,
            last_name: lastName
          });
          
        if (insertProfileError) {
          console.error("Error creating profile for existing user:", insertProfileError);
        } else {
          console.log(`Created profile for existing user ${userId}`);
        }
      } else {
        console.log(`Profile for user ${userId} exists`);
      }
      
      // Check if user already has roles assigned
      const { data: existingRoles, error: checkRoleError } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
        
      if (checkRoleError) {
        console.error('Error checking existing user roles:', checkRoleError);
      } else if (!existingRoles || existingRoles.length === 0) {
        console.log('User has no roles assigned, assigning role now');
        
        // Assign role to existing user
        const { result, error: assignRoleError } = await assignUserRole(
          supabaseClient,
          userId,
          role,
          garageId,
          userType
        );
        
        if (assignRoleError) {
          console.error("Error assigning role to existing user:", assignRoleError);
        } else {
          console.log("Successfully assigned role to existing user");
        }
      } else {
        console.log('User already has roles assigned, not creating duplicates');
      }
      
      // Return success response with existing user id
      return new Response(
        JSON.stringify({ 
          message: 'User already exists and has been updated if needed',
          userId: userId,
          status: 'success' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 OK instead of 409
        }
      );
    }
    
    // Create new user account if user doesn't exist
    const { userData, error: createUserError } = await createUserAccount(
      supabaseClient, 
      email, 
      password, 
      firstName, 
      lastName
    );
    
    if (createUserError) {
      return createUserError;
    }

    console.log(`User created with ID: ${userData.user.id}, now assigning role...`);

    // Assign role to user (garageId may be null for owners/administrators)
    const { result, error: assignRoleError } = await assignUserRole(
      supabaseClient,
      userData.user.id,
      role,
      garageId,
      userType
    );
    
    if (assignRoleError) {
      console.warn('Role assignment had issues but user was created:', result);
      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201, // Still return success since user was created
        }
      );
    }

    console.log('User creation completed successfully:', result);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in create-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
