
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

    const { email, password, firstName, lastName, role, garageId } = body;
    
    // Create user account
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

    // Assign role to user (garageId may be null for owners/administrators)
    const { result, error: assignRoleError } = await assignUserRole(
      supabaseClient,
      userData.user.id,
      role,
      garageId
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
