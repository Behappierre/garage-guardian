
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { UserData } from "@/hooks/admin/useUserManagement";

interface UserManagementTableProps {
  users: UserData[] | undefined;
  onDeleteUser: (userId: string) => void;
}

export function UserManagementTable({ users, onDeleteUser }: UserManagementTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8">No users found for this garage</div>
    );
  }

  return (
    <>
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
          {users.map((user) => (
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
                      onDeleteUser(user.id);
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
    </>
  );
}
