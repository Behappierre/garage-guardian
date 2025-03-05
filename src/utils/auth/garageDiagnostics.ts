
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Run a series of diagnostic queries to understand user-garage relationships
 * This can be used during development or as an admin tool to debug issues
 */
export async function runGarageDiagnostics(userId: string): Promise<void> {
  console.log("=== STARTING GARAGE ACCESS DIAGNOSTICS ===");
  console.log(`Testing for user ID: ${userId}`);
  
  try {
    // 1. Check profile data
    console.log("\n📊 CHECKING PROFILE...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
    } else if (!profileData) {
      console.log("⚠️ No profile found for user");
    } else {
      console.log("✅ Profile found:", profileData);
      
      // Check if garage exists
      if (profileData.garage_id) {
        const { data: garageData, error: garageError } = await supabase
          .from('garages')
          .select('id, name, slug')
          .eq('id', profileData.garage_id)
          .maybeSingle();
          
        if (garageError) {
          console.error(`❌ Profile has garage_id but garage not found: ${profileData.garage_id}`);
        } else if (!garageData) {
          console.log(`⚠️ Profile references non-existent garage: ${profileData.garage_id}`);
        } else {
          console.log(`✅ Profile's garage exists: ${garageData.name} (${garageData.slug})`);
        }
      }
    }
    
    // 2. Check garage membership
    console.log("\n📊 CHECKING GARAGE MEMBERSHIPS...");
    const { data: memberData, error: memberError } = await supabase
      .from('garage_members')
      .select('id, garage_id, role')
      .eq('user_id', userId);
      
    if (memberError) {
      console.error("❌ Error fetching garage memberships:", memberError);
    } else if (!memberData || memberData.length === 0) {
      console.log("⚠️ No garage memberships found");
    } else {
      console.log(`✅ Found ${memberData.length} garage memberships:`, memberData);
      
      // Check if these garages exist
      for (const membership of memberData) {
        const { data: garageData, error: garageError } = await supabase
          .from('garages')
          .select('id, name, slug')
          .eq('id', membership.garage_id)
          .maybeSingle();
          
        if (garageError) {
          console.error(`❌ Error checking membership garage: ${garageError.message}`);
        } else if (!garageData) {
          console.log(`⚠️ Membership references non-existent garage: ${membership.garage_id}`);
        } else {
          console.log(`✅ Membership garage exists: ${garageData.name} (${garageData.slug})`);
        }
      }
    }
    
    // 3. Check owned garages
    console.log("\n📊 CHECKING OWNED GARAGES...");
    const { data: ownedData, error: ownedError } = await supabase
      .from('garages')
      .select('id, name, slug')
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error("❌ Error fetching owned garages:", ownedError);
    } else if (!ownedData || ownedData.length === 0) {
      console.log("⚠️ No owned garages found");
    } else {
      console.log(`✅ Found ${ownedData.length} owned garages:`, ownedData);
    }
    
    // 4. Check user role
    console.log("\n📊 CHECKING USER ROLE...");
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (roleError) {
      console.error("❌ Error fetching user role:", roleError);
    } else if (!roleData) {
      console.log("⚠️ No role assigned to user");
    } else {
      console.log(`✅ User role: ${roleData.role}`);
    }
    
    // 5. Test default garage existence
    console.log("\n📊 CHECKING DEFAULT GARAGE...");
    const { data: defaultGarage, error: defaultError } = await supabase
      .from('garages')
      .select('id, name, slug')
      .eq('slug', 'tractic')
      .maybeSingle();
      
    if (defaultError) {
      console.error("❌ Error checking default garage:", defaultError);
    } else if (!defaultGarage) {
      console.log("⚠️ Default 'tractic' garage not found");
    } else {
      console.log(`✅ Default garage exists: ${defaultGarage.name} (${defaultGarage.slug})`);
    }
    
    console.log("\n=== DIAGNOSTICS COMPLETE ===");
  } catch (error) {
    console.error("❌ Unexpected error during diagnostics:", error);
  }
}

/**
 * Logs meaningful error messages for garage assignment failures
 */
export function logGarageAssignmentError(error: any, context: string): void {
  console.error(`Garage Assignment Error [${context}]:`, error);
  
  // Extract meaningful error message
  let errorMessage = "Unknown error occurred";
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && error.message) {
    errorMessage = error.message;
    
    // Check for specific Supabase errors
    if (error.code === '42702') {
      errorMessage = "Database error: Ambiguous column reference";
    } else if (error.code === '23503') {
      errorMessage = "Database error: Reference violation";
    }
  }
  
  // Log to console and UI
  console.error(errorMessage);
  toast({
    variant: "destructive",
    title: "Garage Assignment Error",
    description: errorMessage
  });
}
