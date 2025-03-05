
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";

export interface UserData {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
}

export function useUserManagement() {
  const queryClient = useQueryClient();
  const { garageId, user } = useAuth();

  const usersQuery = useQuery({
    queryKey: ["users", garageId, user?.id],
    queryFn: async () => {
      try {
        console.log('Fetching users data for garage ID:', garageId);
        console.log('Current user ID:', user?.id);
        
        // First try to get the user's own profile data if nothing else is available
        if (!garageId && user?.id) {
          console.log('No garage ID available, fetching current user profile');
          
          // Get the current user's profile
          const { data: currentUserProfile, error: profileError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error('Error fetching current user profile:', profileError);
          }

          // Get the current user's role
          const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

          if (roleError) {
            console.error('Error fetching current user role:', roleError);
          }

          // Get the user's email from auth function
          const { data: usersResponse, error: usersError } = await supabase.functions.invoke('get-users');
          
          if (usersError) {
            console.error('Error fetching users:', usersError);
            throw usersError;
          }

          const currentUserData = usersResponse?.users?.find((u: any) => u.id === user.id);
          
          if (currentUserProfile && userRole && currentUserData) {
            const userData: UserData[] = [{
              id: user.id,
              email: currentUserData.email || '',
              role: userRole.role || "none",
              first_name: currentUserProfile.first_name || null,
              last_name: currentUserProfile.last_name || null,
            }];
            
            console.log('Current user data:', userData);
            return userData;
          }
        }

        // If garageId is available, proceed with the normal flow
        if (garageId) {
          // First get profiles data filtered by garage_id
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("garage_id", garageId);

          console.log('Profiles data:', profiles);
          console.log('Profiles error:', profilesError);

          if (profilesError) throw profilesError;
          
          if (!profiles || profiles.length === 0) {
            console.log('No profiles found for this garage');
            return [];
          }

          // Get user IDs from profiles
          const userIds = profiles.map(profile => profile.id);

          // Then get roles data
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);

          console.log('Roles data:', roles);
          console.log('Roles error:', rolesError);

          if (rolesError) throw rolesError;

          // Finally get users data using the Edge Function
          console.log('Calling get-users function...');
          const { data: usersResponse, error: usersError } = await supabase.functions.invoke('get-users');
          
          console.log('Users response:', usersResponse);
          console.log('Users error:', usersError);

          if (usersError) throw usersError;

          if (!usersResponse || !usersResponse.users) {
            throw new Error('Failed to fetch users: No users data returned');
          }

          // Filter users to only include those with profiles in the current garage
          const filteredUsers = usersResponse.users.filter((user: any) => 
            userIds.includes(user.id)
          );

          console.log('Filtered users:', filteredUsers);

          // Map the data together
          const mappedUsers = filteredUsers.map((user: any) => {
            const userProfile = profiles?.find((p: any) => p.id === user.id);
            const userRole = roles?.find((r: any) => r.user_id === user.id);
            
            return {
              id: user.id,
              email: user.email || '',
              role: userRole?.role || "none",
              first_name: userProfile?.first_name || null,
              last_name: userProfile?.last_name || null,
            };
          });

          console.log('Mapped users data:', mappedUsers);
          return mappedUsers;
        }
        
        // If we get here, we have no data to return
        console.warn('No garage ID or user ID available');
        return [];
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!user?.id, // Enable the query if at least the user ID is available
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", garageId] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error deleting user: ${error.message}`);
    },
  });

  return {
    users: usersQuery.data,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending
  };
}
