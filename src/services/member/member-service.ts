
import { supabase } from "@/integrations/supabase/client";
import { GarageMember, GarageRole } from "@/types/garage";
import { GarageMembersResponse } from "./types";

/**
 * Retrieves members of a garage
 */
export const getGarageMembers = async (garageId: string): Promise<GarageMembersResponse> => {
  try {
    // Step 1: Fetch garage members
    const { data: membersData, error: membersError } = await supabase
      .from("garage_members")
      .select("*")
      .eq("garage_id", garageId);
    
    if (membersError) throw membersError;
    
    if (!membersData || membersData.length === 0) {
      return { members: [], error: null };
    }
    
    // Step 2: Extract user IDs using traditional loop
    const userIds: string[] = [];
    for (let i = 0; i < membersData.length; i++) {
      userIds.push(membersData[i].user_id);
    }
    
    // Step 3: Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);
    
    if (profilesError) throw profilesError;
    
    // Step 4: Create a profile lookup object
    type ProfileLookup = {
      [key: string]: {
        id: string;
        first_name: string | null;
        last_name: string | null;
      }
    };
    
    const profileMap: ProfileLookup = {};
    
    if (profilesData) {
      for (let i = 0; i < profilesData.length; i++) {
        const profile = profilesData[i];
        profileMap[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name
        };
      }
    }
    
    // Step 5: Build members array with explicit typing
    const members: GarageMember[] = [];
    
    for (let i = 0; i < membersData.length; i++) {
      const member = membersData[i];
      const profile = profileMap[member.user_id];
      
      members.push({
        id: member.id,
        garage_id: member.garage_id,
        user_id: member.user_id,
        role: member.role as GarageRole,
        created_at: member.created_at,
        profile: profile ? {
          id: profile.id,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null
        } : null
      });
    }
    
    return { members, error: null };
  } catch (error) {
    console.error("Error fetching garage members:", error);
    return { members: [], error };
  }
};
