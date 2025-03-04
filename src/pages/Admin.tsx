
import { useState, useEffect } from "react";
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
  const { garageId, loading } = useAuth();

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

  // If auth has loaded but we don't have a garageId, show an error
  if (!garageId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load admin dashboard. Please make sure you are associated with a garage.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
