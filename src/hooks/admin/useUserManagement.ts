
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
        
        if (!garageId) {
          console.warn('No garage ID available, cannot fetch users');
          return [];
        }

        // First get all users from auth system
        const { data: usersResponse, error: usersError } = await supabase.functions.invoke('get-users');
        
        if (usersError) {
          console.error('Error fetching users:', usersError);
          throw usersError;
        }

        if (!usersResponse || !usersResponse.users) {
          throw new Error('Failed to fetch users: No users data returned');
        }
        
        // Now get all user roles specific to this garage
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("garage_id", garageId);

        if (rolesError) {
          console.error('Error fetching roles for garage:', rolesError);
          throw rolesError;
        }
        
        console.log('User roles for garage:', roles);
        
        // Also get profiles for better user data
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name");

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Get user IDs that belong to this garage
        const garageUserIds = roles.map(role => role.user_id);
        console.log('User IDs in this garage:', garageUserIds);
        
        // Filter users to only include those with roles in the current garage
        const filteredUsers = usersResponse.users.filter((user: any) => 
          garageUserIds.includes(user.id)
        );
        
        console.log('Filtered users for this garage:', filteredUsers);

        // Map the data together
        const mappedUsers = filteredUsers.map((user: any) => {
          const userProfile = profiles?.find((p: any) => p.id === user.id);
          const userRole = roles?.find((r: any) => r.user_id === user.id);
          
          return {
            id: user.id,
            email: user.email || '',
            role: userRole?.role || "none",
            first_name: userProfile?.first_name || user.user_metadata?.first_name || null,
            last_name: userProfile?.last_name || user.user_metadata?.last_name || null,
          };
        });

        console.log('Mapped users data for this garage:', mappedUsers);
        return mappedUsers;
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!garageId && !!user?.id,
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
