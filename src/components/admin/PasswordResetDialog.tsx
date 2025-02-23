
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PasswordResetDialogProps {
  user: {
    id: string;
    email: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetDialog({
  user,
  open,
  onOpenChange,
}: PasswordResetDialogProps) {
  const [newPassword, setNewPassword] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setNewPassword("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Error resetting password: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              disabled={!newPassword}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
