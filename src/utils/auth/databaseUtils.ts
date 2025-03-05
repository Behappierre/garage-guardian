
import { supabase } from "@/integrations/supabase/client";

/**
 * Safely extracts a count value from a database query result
 */
export function extractCountFromResult(result: any): number {
  if (!result) return 0;
  
  try {
    if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0];
      
      if (typeof firstItem === 'object' && firstItem !== null) {
        // Try to find a property that contains 'count' in its name
        const countKey = Object.keys(firstItem).find(key => 
          key.toLowerCase().includes('count')
        );
        
        if (countKey) {
          return parseInt(String(firstItem[countKey]), 10) || 0;
        }
      }
    }
    return 0;
  } catch (error) {
    console.error("Error extracting count from result:", error);
    return 0;
  }
}

/**
 * Executes a read-only SQL query safely
 */
export async function executeReadOnlyQuery(query: string) {
  try {
    const { data, error } = await supabase.rpc('execute_read_only_query', {
      query_text: query
    });
    
    if (error) {
      console.error("Error executing read-only query:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in executeReadOnlyQuery:", error);
    return null;
  }
}
