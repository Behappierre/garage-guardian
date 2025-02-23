
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AppRole>("front_desk");
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting to create user:', { email, firstName, lastName, role });
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          firstName,
          lastName,
          role,
        },
      });

      console.log('Response from create-user function:', { data, error });

      if (error) {
        console.error('Error from create-user function:', error);
        throw new Error(error.message || 'Failed to create user');
      }
      
      if (!data || data.status === 'error') {
        console.error('Error response from create-user function:', data);
        throw new Error(data?.error || 'Failed to create user');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      onOpenChange(false);
      // Reset form
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setRole("front_desk");
    },
    onError: (error: Error) => {
      console.error('Error in createUserMutation:', error);
      toast.error(`Error creating user: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserMutation.mutate();
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <RadioGroup value={role} onValueChange={(value: AppRole) => setRole(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="administrator" id="admin" />
                <Label htmlFor="admin">Administrator</Label>
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
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
