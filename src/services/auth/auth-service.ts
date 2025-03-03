
import { supabase } from "@/integrations/supabase/client";

// Define a simple interface for the auth response to avoid excessive type instantiation
interface AuthResponse {
  data?: {
    user?: {
      id?: string;
    };
  };
  error?: any;
}

/**
 * Handles user signup with Supabase
 */
export async function handleSignUp(email: string, password: string, firstName: string, lastName: string): Promise<string | null> {
  try {
    // Use the simpler AuthResponse interface to break the type dependency chain
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    }) as unknown as AuthResponse;
    
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
    // Use the simpler AuthResponse interface to break the type dependency chain
    const response = await supabase.auth.signInWithPassword({
      email,
      password
    }) as unknown as AuthResponse;
    
    if (response.error) throw response.error;
    return response.data?.user?.id || null;
  } catch (error) {
    throw error;
  }
}
