import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export async function handleClientManagement(
  message: string, 
  supabase: any, 
  entities?: Record<string, string>
) {
  console.log('Processing client request:', message);
  
  try {
    // Get the user's garage ID from the request context if available
    const garageId = supabase.auth.garageId;
    
    let clientsQuery = supabase.from('clients').select('*');
    
    // Filter by garage ID if available
    if (garageId) {
      clientsQuery = clientsQuery.eq('garage_id', garageId);
    }
    
    const { data: clients, error } = await clientsQuery;
    
    if (error) {
      console.error('Error fetching clients:', error);
      return "I encountered an error when trying to access client information. Please try again later.";
    }
    
    if (!clients || clients.length === 0) {
      return "I don't see any clients in your garage yet. Would you like information on how to add clients?";
    }
    
    // Basic analysis of clients
    const clientCount = clients.length;
    const recentClients = clients
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    
    const clientSummary = recentClients.map(client => 
      `${client.first_name} ${client.last_name} (${client.email || 'No email'})`
    ).join(', ');
    
    return `You have ${clientCount} clients in your garage. Your most recent clients are ${clientSummary}. How can I help you with client information?`;
  } catch (err) {
    console.error('Error in client handler:', err);
    return "I'm having trouble accessing client information right now. Please try again later.";
  }
}
