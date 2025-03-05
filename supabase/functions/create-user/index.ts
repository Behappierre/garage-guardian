
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

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { email, password, firstName, lastName, role, garageId } = body;
    
    if (!email || !password || !firstName || !lastName || !role) {
      console.error('Missing required fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName, role: !!role });
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
      console.error('No garage ID provided');
      return new Response(
        JSON.stringify({ 
          error: 'No garage ID provided. Please select a garage first.',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating user with email:', email, 'to be assigned to garage:', garageId);
    console.log('Role selected:', role);

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
      console.error('User creation failed - no user data returned');
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

    console.log('User created:', userData.user.id);

    // Assign the role and garage_id
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

    console.log('User role assigned successfully:', role);

    // Also update the user's profile with the garage_id
    if (garageId) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userData.user.id);

      if (profileError) {
        console.error('Error updating user profile with garage_id:', profileError);
        // Don't fail the entire operation, just log the error
      } else {
        console.log('Updated user profile with garage_id:', garageId);
      }
    }

    console.log('User created and role assigned successfully');

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        userId: userData.user.id,
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
