
// Chat memory management - stores conversation history and state

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const MEMORY_LIMIT = 5; // Number of recent exchanges to keep

/**
 * Update the chat memory for a user
 */
export async function updateChatMemory(
  userId: string,
  message: string,
  response: string,
  intent: string,
  entities: Record<string, string> | undefined,
  supabase: any
) {
  try {
    // Store the message in chat history
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        message: message,
        response: response,
        metadata: {
          intent,
          entities,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error storing chat message:', error);
    }
  } catch (err) {
    console.error('Exception in updateChatMemory:', err);
  }
}

/**
 * Get recent conversation context for a user
 */
export async function getConversationContext(userId: string, supabase: any): Promise<string | null> {
  try {
    // Get the most recent messages
    const { data, error } = await supabase
      .from('chat_messages')
      .select('message, response, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MEMORY_LIMIT);
    
    if (error) {
      console.error('Error fetching conversation history:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Format the conversation context
    let context = "Recent conversation:\n";
    
    // Reverse to get chronological order
    data.reverse().forEach((item: any) => {
      context += `User: ${item.message}\n`;
      context += `Assistant: ${item.response}\n`;
    });
    
    return context;
  } catch (err) {
    console.error('Exception in getConversationContext:', err);
    return null;
  }
}

/**
 * Get the current conversation state for a user
 */
export async function getConversationState(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No state found, this is normal for new conversations
        return null;
      }
      console.error('Error fetching conversation state:', error);
      return null;
    }
    
    // Check if the state has expired
    if (data && new Date(data.expires_at) < new Date()) {
      // State has expired, delete it
      await clearConversationState(userId, supabase);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Exception getting conversation state:', err);
    return null;
  }
}

/**
 * Save or update the conversation state for a user
 */
export async function saveConversationState(
  userId: string,
  stage: string,
  data: Record<string, any>,
  supabase: any,
  expiryMinutes: number = 15
): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    const { error } = await supabase
      .from('conversation_states')
      .upsert({
        user_id: userId,
        stage: stage,
        data: data,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'user_id'
      });
      
    if (error) {
      console.error('Error saving conversation state:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Exception saving conversation state:', err);
    return false;
  }
}

/**
 * Clear the conversation state for a user
 */
export async function clearConversationState(userId: string, supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversation_states')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error clearing conversation state:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Exception clearing conversation state:', err);
    return false;
  }
}
