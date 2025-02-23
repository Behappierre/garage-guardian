
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
import { User } from '@supabase/supabase-js';

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

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // First get profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");

      if (profilesError) throw profilesError;

      // Then get roles data
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Finally get users data using the Edge Function
      const { data: usersResponse, error: usersError } = await supabase.functions.invoke('get-users');
      
      if (usersError) throw usersError;

      if (!usersResponse || !usersResponse.users) {
        throw new Error('Failed to fetch users');
      }

      // Map the data together
      return usersResponse.users.map((user: User) => ({
        id: user.id,
        email: user.email || '',
        role: roles.find((r: any) => r.user_id === user.id)?.role || "none",
        first_name: profiles.find((p: any) => p.id === user.id)?.first_name || null,
        last_name: profiles.find((p: any) => p.id === user.id)?.last_name || null,
      }));
    },
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error deleting user: ${error.message}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setIsCreateUserDialogOpen(true)}>
          Create User
        </Button>
      </div>
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
          {users?.map((user: UserData) => (
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
