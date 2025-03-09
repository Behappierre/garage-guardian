
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserManagement } from "@/components/admin/UserManagement";
import { TechnicianCosts } from "@/components/admin/TechnicianCosts";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { AdminOperations } from "@/components/admin/AdminOperations";
import { OpeningTimes } from "@/components/admin/opening-times";

export default function Admin() {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);

  return (
    <div className="container">
      <PageHeader
        title="Admin"
        description="Manage user accounts, costs, and system settings."
      />

      <div className="px-8 pb-8 space-y-6">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="technician-costs">Technician Costs</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="opening-times">Business Hours</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Button onClick={() => setIsCreateUserDialogOpen(true)}>
                Add User
              </Button>
            </div>
            
            <UserManagement
              isCreateUserDialogOpen={isCreateUserDialogOpen}
              setIsCreateUserDialogOpen={setIsCreateUserDialogOpen}
            />
          </TabsContent>
          
          <TabsContent value="technician-costs">
            <TechnicianCosts />
          </TabsContent>
          
          <TabsContent value="operations">
            <AdminOperations />
          </TabsContent>

          <TabsContent value="opening-times">
            <OpeningTimes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

