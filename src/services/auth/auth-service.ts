
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles user signup with Supabase
 */
export async function handleSignUp(email: string, password: string, firstName: string, lastName: string): Promise<string | null> {
  try {
    // Use any to break the type dependency chain completely
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    }) as any;
    
    if (response.error) throw response.error;
    return response.data?.user?.id || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Handles user signin with Supabase
 */
export async function handleSignIn(email: string, password: string): Promise<string | null> {
  try {
    // Use any to break the type dependency chain completely
    const response = await supabase.auth.signInWithPassword({
      email,
      password
    }) as any;
    
    if (response.error) throw response.error;
    return response.data?.user?.id || null;
  } catch (error) {
    throw error;
  }
}
