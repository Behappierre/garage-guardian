
import { useState } from "react";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TechnicianCosts } from "@/components/admin/TechnicianCosts";
import { UserManagement } from "@/components/admin/UserManagement";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const Admin = () => {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const { user, garageId, loading } = useAuth();

  // If auth is still loading, show a loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-8 w-full max-w-md mb-6" />
        <div className="grid gap-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  // If no user is logged in, show an error
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            You must be logged in to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Always render the dashboard, even if garageId is null
  // Our updated UserManagement hook will handle displaying at least the current user
  return (
    <div className="container mx-auto py-6">
      {!garageId && (
        <Alert className="mb-6">
          <AlertDescription>
            No garage association detected. Limited functionality available.
          </AlertDescription>
        </Alert>
      )}
      
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
          <UserManagement 
            isCreateUserDialogOpen={isCreateUserDialogOpen}
            setIsCreateUserDialogOpen={setIsCreateUserDialogOpen}
          />
        </TabsContent>
        
        <TabsContent value="costs" className="pt-4">
          <TechnicianCosts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
