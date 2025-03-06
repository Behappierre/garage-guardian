
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteRequestedUsers } from "@/utils/deleteBatchUsers";
import { useState } from "react";

export function AdminOperations() {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleBatchDelete = async () => {
    if (confirm("Are you sure you want to delete these users? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await deleteRequestedUsers();
      } catch (error) {
        console.error("Error during batch deletion:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Admin Operations</CardTitle>
        <CardDescription>
          Special administrative operations for system maintenance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">User Management</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Delete specific test users from the system
          </p>
          <Button 
            variant="destructive" 
            onClick={handleBatchDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Test Users"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
