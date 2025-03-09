
import { corsHeaders } from './utils.ts';

export const validateRequest = async (req: Request) => {
  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role', 'userType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          body: null,
          error: new Response(
            JSON.stringify({ 
              error: `Missing required field: ${field}`,
              status: 'error'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        };
      }
    }
    
    return { body, error: null };
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {
      body: null,
      error: new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    };
  }
};
