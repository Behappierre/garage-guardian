
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
    console.log('Received request to create-garage function');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body = await req.json();
    const { name, slug, address, email, phone, userId } = body;
    
    console.log(`Creating garage: ${name} for user: ${userId}`);
    
    if (!name || !slug || !address || !email || !userId) {
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

    // Verify the userId exists in auth.users to prevent invalid references
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData || !userData.user) {
      console.error("Invalid user ID provided:", userError || "User not found");
      return new Response(
        JSON.stringify({ 
          error: 'Invalid user ID - unable to create garage',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate a unique slug by adding a random suffix if needed
    const createUniqueSlug = async (baseSlug: string): Promise<string> => {
      // Check if the slug already exists
      const { data: existingGarage, error } = await supabase
        .from('garages')
        .select('slug')
        .eq('slug', baseSlug)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking slug:", error);
        throw new Error(`Failed to check slug uniqueness: ${error.message}`);
      }
      
      // If slug exists, add a random suffix
      if (existingGarage) {
        const randomSuffix = Math.floor(Math.random() * 10000);
        const newSlug = `${baseSlug}-${randomSuffix}`;
        console.log(`Slug ${baseSlug} already exists, trying ${newSlug}`);
        
        // Recursively check until we find a unique slug
        return createUniqueSlug(newSlug);
      }
      
      return baseSlug;
    };
    
    // Ensure slug is unique before proceeding
    const uniqueSlug = await createUniqueSlug(slug);
    console.log(`Using unique slug: ${uniqueSlug}`);

    // Step 1: Create the garage record
    const { data: garageData, error: garageError } = await supabase
      .from('garages')
      .insert([
        {
          name,
          slug: uniqueSlug,
          address,
          email,
          phone,
          owner_id: userId
        }
      ])
      .select();
    
    if (garageError) {
      console.error("Error creating garage:", garageError);
      return new Response(
        JSON.stringify({ 
          error: garageError.message,
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    if (!garageData || garageData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create garage - no data returned',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    const garageId = garageData[0].id;
    console.log(`Created garage with ID: ${garageId}`);
    
    try {
      // Step 2: Add the user as an owner in garage_members
      console.log(`Adding user ${userId} as owner in garage_members for garage ${garageId}`);
      
      // First verify if the user is already in the garage_members table
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();
        
      if (membershipCheckError) {
        console.error("Error checking garage membership:", membershipCheckError);
      }
      
      if (existingMembership) {
        // Update existing membership instead of creating a new one
        console.log(`User ${userId} already has an owner membership, updating garage_id to ${garageId}`);
        
        const { error: updateError } = await supabase
          .from('garage_members')
          .update({ garage_id: garageId })
          .eq('id', existingMembership.id);
          
        if (updateError) {
          console.error("Error updating garage member:", updateError);
        } else {
          console.log("Successfully updated garage_members record");
        }
      } else {
        // Create a new membership
        console.log(`Creating new garage_members record for user ${userId} and garage ${garageId}`);
        
        const { error: insertError } = await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: garageId,
            role: 'owner'
          });
          
        if (insertError) {
          console.error("Error inserting garage member:", insertError);
        } else {
          console.log("Successfully created garage_members record");
        }
      }
    } catch (memberError) {
      console.error("Error handling garage membership:", memberError);
      // Continue execution - we don't want to fail the entire request due to membership issues
    }
    
    try {
      // Step 3: Update user's profile with the garage_id
      console.log(`Updating profile for user ${userId} with garage_id ${garageId}`);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
      
      if (profileError) {
        console.error("Error updating user profile:", profileError);
      } else {
        console.log("Successfully updated user profile with new garage_id");
      }
    } catch (profileError) {
      console.error("Error updating profile:", profileError);
      // Continue execution
    }
    
    try {
      // Step 4: Update or add administrator role
      console.log(`Ensuring user ${userId} has administrator role for garage ${garageId}`);
      
      // First check if user has an existing role
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('id, garage_id')
        .eq('user_id', userId)
        .eq('role', 'administrator')
        .maybeSingle();
        
      if (existingRoles) {
        // Update existing role with the new garage_id
        console.log(`User already has admin role, updating garage_id to ${garageId}`);
        
        const { error: updateRoleError } = await supabase
          .from('user_roles')
          .update({ garage_id: garageId })
          .eq('id', existingRoles.id);
          
        if (updateRoleError) {
          console.error("Error updating user role:", updateRoleError);
        } else {
          console.log("Successfully updated user_roles record");
        }
      } else {
        // Insert new role
        console.log(`Creating new admin role for user ${userId} and garage ${garageId}`);
        
        const { error: insertRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'administrator',
            garage_id: garageId
          });
          
        if (insertRoleError) {
          console.error("Error inserting user role:", insertRoleError);
        } else {
          console.log("Successfully created user_roles record");
        }
      }
    } catch (roleError) {
      console.error("Error handling user roles:", roleError);
      // Continue execution
    }
    
    return new Response(
      JSON.stringify({ 
        id: garageId,
        name,
        status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in create-garage function:', error);
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
