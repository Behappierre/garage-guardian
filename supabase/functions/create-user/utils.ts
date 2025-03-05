
// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create error responses
export const createErrorResponse = (message: string, status: number = 400) => {
  return new Response(
    JSON.stringify({ 
      error: message,
      status: 'error'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
};
