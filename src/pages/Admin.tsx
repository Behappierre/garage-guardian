
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRoleDialog } from "@/components/admin/UserRoleDialog";
import { PasswordResetDialog } from "@/components/admin/PasswordResetDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { TechnicianCosts } from "@/components/admin/TechnicianCosts";
import { User } from '@supabase/supabase-js';
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";

interface UserData {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
}

const Admin = () => {
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { garageId } = useAuth();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users", garageId],
    queryFn: async () => {
      try {
        console.log('Fetching users data for garage ID:', garageId);
        if (!garageId) {
          console.error("No garage ID available");
          return [];
        }

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
        const filteredUsers = usersResponse.users.filter((user: User) => 
          userIds.includes(user.id)
        );

        console.log('Filtered users:', filteredUsers);

        // Map the data together
        const mappedUsers = filteredUsers.map((user: User) => {
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
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    enabled: !!garageId, // Only run query when garageId is available
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

  if (error) {
    console.error('Query error:', error);
    return <div>Error loading users: {error.message}</div>;
  }

  if (isLoading || !garageId) {
    return <div>Loading...</div>;
  }

  const renderUserManagement = () => {
    if (!users || users.length === 0) {
      return (
        <div className="text-center py-8">No users found for this garage</div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user: UserData) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(user);
                    setIsRoleDialogOpen(true);
                  }}
                >
                  Change Role
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(user);
                    setIsPasswordDialogOpen(true);
                  }}
                >
                  Reset Password
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this user?")) {
                      deleteUserMutation.mutate(user.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Admin Dashboard"
      >
        <PageActionButton 
          icon={<UserPlus className="h-4 w-4" />}
          onClick={() => setIsCreateUserDialogOpen(true)}
        >
          Create User
        </PageActionButton>
      </PageHeader>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="costs">Technician Costs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="pt-4">
          {renderUserManagement()}
        </TabsContent>
        
        <TabsContent value="costs" className="pt-4">
          <TechnicianCosts />
        </TabsContent>
      </Tabs>

      {selectedUser && (
        <>
          <UserRoleDialog
            user={selectedUser}
            open={isRoleDialogOpen}
            onOpenChange={setIsRoleDialogOpen}
          />
          <PasswordResetDialog
            user={selectedUser}
            open={isPasswordDialogOpen}
            onOpenChange={setIsPasswordDialogOpen}
          />
        </>
      )}
      
      <CreateUserDialog
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
      />
    </div>
  );
};

export default Admin;
