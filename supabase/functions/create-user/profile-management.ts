
import { corsHeaders } from './utils.ts';

export const createUserAccount = async (
  supabaseClient: any,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  garageId: string | null
) => {
  try {
    console.log(`Attempting to create or retrieve user with email: ${email}`);
    
    // First check if user already exists in auth
    const { data: existingUsers, error: lookupError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
      
    if (lookupError) {
      console.warn('Error checking for existing user:', lookupError);
      // Continue with creation attempt
    }
    
    let userData: any;
    let isExisting = false;
    
    if (existingUsers?.id) {
      // User exists, get their data
      console.log('User already exists, retrieving data');
      isExisting = true;
      
      const { data: existingUserData, error: getUserError } = await supabaseClient.auth.admin.getUserById(
        existingUsers.id
      );
      
      if (getUserError) {
        console.error('Error retrieving existing user:', getUserError);
        return {
          userData: null,
          error: new Response(
            JSON.stringify({ 
              error: 'Failed to retrieve existing user account',
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
      
      userData = existingUserData;
    } else {
      // Create new user
      console.log('Creating new user account');
      
      const { data: newUserData, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        },
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
              status: 400,
            }
          ),
          isExisting: false
        };
      }
      
      userData = newUserData;
      
      // Immediately create profile for new user
      console.log(`Creating profile for new user: ${userData.user.id}`);
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId,
          email: email
        });
        
      if (profileError) {
        console.error('Error creating profile for new user:', profileError);
        // Log error but continue since user was created
      } else {
        console.log('Successfully created profile for new user');
      }
    }
    
    // Double check profile exists and create if missing
    const { data: profileExists } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userData.user.id)
      .single();
      
    if (!profileExists) {
      console.log(`Profile not found for user: ${userData.user.id}, creating it now`);
      const { error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId,
          email: email
        });
        
      if (createProfileError) {
        console.error('Error creating missing profile:', createProfileError);
        // Log error but continue since user exists
      } else {
        console.log('Successfully created missing profile');
      }
    }
    
    return { userData, error: null, isExisting };
  } catch (error: any) {
    console.error('Unexpected error in createUserAccount:', error);
    return {
      userData: null,
      error: new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to create or retrieve user account',
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

export const ensureProfileExists = async (supabaseClient: any, userId: string, firstName: string, lastName: string, garageId: string | null = null) => {
  try {
    // Check if profile exists
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (!profileData) {
      // Get user email from auth
      const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
      const email = userData?.user?.email || '';
      
      // Create profile if missing
      const { error: createError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId,
          email: email
        });
        
      if (createError) {
        console.error('Error creating profile:', createError);
        return { success: false, error: createError };
      }
      
      return { success: true, created: true };
    }
    
    return { success: true, created: false };
  } catch (error) {
    console.error('Error in ensureProfileExists:', error);
    return { success: false, error };
  }
};
