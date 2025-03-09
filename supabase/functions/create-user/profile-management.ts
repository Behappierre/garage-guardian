
import { corsHeaders } from './utils.ts';

// Helper function to ensure a profile exists with retry logic
export async function ensureProfileExists(supabase: any, userId: string, firstName: string, lastName: string, garageId?: string | null) {
  // First check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
    
  if (checkError) {
    console.log('Error checking for existing profile:', checkError.message);
  }
    
  if (existingProfile) {
    console.log('Profile already exists for user:', userId);
    return true;
  }
  
  console.log('Creating profile for user:', userId);
  
  // Try up to 3 times to create the profile
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId
        });
        
      if (profileError) {
        console.error(`Profile creation attempt ${attempt} failed:`, profileError);
        if (attempt < 3) {
          console.log(`Waiting before retry ${attempt+1}...`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
        } else {
          console.error('All profile creation attempts failed for user:', userId);
          return false;
        }
      } else {
        console.log('Profile created successfully for user:', userId);
        return true; // Success, exit the function
      }
    } catch (error) {
      console.error(`Unexpected error in profile creation attempt ${attempt}:`, error);
      if (attempt >= 3) {
        console.error('All profile creation attempts failed with exceptions');
        return false;
      }
    }
  }
  
  return false;
}

export const createUserAccount = async (supabase: any, email: string, password: string, firstName: string, lastName: string, garageId?: string | null) => {
  try {
    console.log(`Attempting to create user with email: ${email}`);
    
    // Check if user already exists
    const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (getUserError) {
      console.error('Error checking if user exists:', getUserError);
      return {
        userData: null,
        error: new Response(
          JSON.stringify({ 
            error: getUserError.message,
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
    
    // If user exists, return user
    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.log('User already exists:', existingUsers.users[0].id);
      
      // Ensure profile exists for existing user
      await ensureProfileExists(supabase, existingUsers.users[0].id, firstName, lastName, garageId);
      
      return {
        userData: { user: existingUsers.users[0] },
        error: null,
        isExisting: true
      };
    }
    
    // Create user if does not exist
    console.log('Creating new user...');
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
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
            status: 500,
          }
        ),
        isExisting: false
      };
    }
    
    console.log('User created successfully:', userData.user.id);
    
    // CRITICAL: Create profile for the new user with multiple attempts if needed
    const profileResult = await ensureProfileExists(supabase, userData.user.id, firstName, lastName, garageId);
    console.log('Profile creation result:', profileResult ? 'Success' : 'Failed');
    
    if (!profileResult) {
      console.error('CRITICAL: Failed to create profile after multiple attempts');
      // Create one more attempt with a direct SQL query as a last resort
      try {
        const { error: rawInsertError } = await supabase.from('profiles').insert({
          id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          garage_id: garageId
        });
        
        if (rawInsertError) {
          console.error('Last resort profile creation failed:', rawInsertError);
        } else {
          console.log('Last resort profile creation succeeded');
        }
      } catch (e) {
        console.error('Exception in last resort profile creation:', e);
      }
    }
    
    return {
      userData,
      error: null,
      isExisting: false
    };
  } catch (error: any) {
    console.error('Unexpected error creating user account:', error);
    return {
      userData: null,
      error: new Response(
        JSON.stringify({ 
          error: error.message,
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
