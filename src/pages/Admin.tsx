
import { useState } from "react";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TechnicianCosts } from "@/components/admin/TechnicianCosts";
import { UserManagement } from "@/components/admin/UserManagement";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserPlus } from "lucide-react";

const Admin = () => {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const { garageId } = useAuth();

  if (!garageId) {
    return <div>Loading...</div>;
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
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="costs" className="pt-4">
          <TechnicianCosts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
