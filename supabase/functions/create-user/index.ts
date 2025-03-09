
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
    
    // Create new user account if user doesn't exist
    const { userData, error: createUserError, isExisting } = await createUserAccount(
      supabaseClient, 
      email, 
      password, 
      firstName, 
      lastName
    );
    
    if (createUserError) {
      return createUserError;
    }

    if (!userData || !userData.user || !userData.user.id) {
      console.error('User data is incomplete after creation:', userData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create or retrieve user account properly',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`User ${isExisting ? 'already exists' : 'created'} with ID: ${userData.user.id}, now assigning role...`);

    // Double-check that the profile exists and create it if not
    const { data: profileExists } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userData.user.id)
      .single();
      
    if (!profileExists) {
      console.log('Profile not found after user creation, creating it now');
      const { error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId
        });
        
      if (createProfileError) {
        console.error('Error creating profile after user creation:', createProfileError);
      } else {
        console.log('Created profile for user after checking:', userData.user.id);
      }
    } else {
      console.log('Profile already exists for user:', userData.user.id);
    }

    // Assign role to user (garageId may be null for owners/administrators)
    const { result, error: assignRoleError } = await assignUserRole(
      supabaseClient,
      userData.user.id,
      role,
      garageId,
      userType
    );
    
    if (assignRoleError) {
      console.warn('Role assignment ha

d issues but user was created:', result);
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
      JSON.stringify({ 
        ...result,
        isExisting,
        userId: userData.user.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isExisting ? 200 : 201,
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
