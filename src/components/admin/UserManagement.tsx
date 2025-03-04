
import { useState } from "react";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { useUserManagement } from "@/hooks/admin/useUserManagement";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { UserPlus } from "lucide-react";

export function UserManagement() {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const { users, isLoading, error, deleteUser } = useUserManagement();

  if (error) {
    console.error('Query error:', error);
    return <div>Error loading users: {error.message}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <UserManagementTable 
        users={users} 
        onDeleteUser={deleteUser} 
      />
      
      <CreateUserDialog
        open={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
      />
    </div>
  );
}
