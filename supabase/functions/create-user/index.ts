
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { email, password, firstName, lastName, role, garageId } = await req.json();
    
    if (!email || !password || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!garageId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing garage ID. Cannot assign user to a garage.',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating user with email:', email, 'for garage:', garageId);

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
      return new Response(
        JSON.stringify({ 
          error: createUserError.message,
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ 
          error: 'User creation failed - no user data returned',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Assign the role AND the garage ID
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert([{ 
        user_id: userData.user.id, 
        role,
        garage_id: garageId 
      }]);

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ 
          error: roleError.message,
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Also update the user's profile with the garage ID for consistency
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userData.user.id);
      
    if (profileError) {
      console.error('Error updating profile with garage ID:', profileError);
      // Don't fail the request since the user_roles update was successful
    }

    // Add user as a member of the garage
    const { error: memberError } = await supabaseClient
      .from('garage_members')
      .insert([{
        user_id: userData.user.id,
        garage_id: garageId,
        role: 'staff'
      }]);

    if (memberError) {
      console.error('Error adding user as garage member:', memberError);
      // Don't fail the request since the primary user creation was successful
    }

    console.log('User created and assigned to garage successfully');

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        userId: userData.user.id,
        garageId: garageId,
        status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
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
