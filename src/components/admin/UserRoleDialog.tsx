
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserRoleDialogProps {
  user: {
    id: string;
    email: string;
    role: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({ user, open, onOpenChange }: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      // First, delete existing role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Then insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{ user_id: user.id, role: selectedRole }]);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Error updating role: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role for {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="administrator" id="administrator" />
              <Label htmlFor="administrator">Administrator</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="technician" id="technician" />
              <Label htmlFor="technician">Technician</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="front_desk" id="front_desk" />
              <Label htmlFor="front_desk">Front Desk</Label>
            </div>
          </RadioGroup>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateRoleMutation.mutate()}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
