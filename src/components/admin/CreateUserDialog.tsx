
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
import { useAuth } from "@/components/auth/AuthProvider";
import { AlertCircle } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { garageId } = useAuth();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("front_desk");
    setError(null);
  };

  const createUserMutation = useMutation({
    mutationFn: async () => {
      setSubmitting(true);
      setError(null);
      
      if (!garageId) {
        throw new Error("No garage selected. Please select a garage first.");
      }
      
      console.log('Attempting to create user:', { email, firstName, lastName, role, garageId });
      
      try {
        const { data, error: invocationError } = await supabase.functions.invoke('create-user', {
          body: {
            email,
            password,
            firstName,
            lastName,
            role,
            garageId,
          },
        });

        console.log('Response from create-user function:', data);

        if (invocationError) {
          console.error('Error from create-user function invocation:', invocationError);
          throw new Error(invocationError.message || 'Failed to invoke create-user function');
        }
        
        if (!data) {
          throw new Error('No data returned from create-user function');
        }
        
        if (data.status === 'error') {
          console.error('Error response from create-user function:', data);
          throw new Error(data.error || 'Failed to create user');
        }
        
        // Handle partial success
        if (data.status === 'partial_success') {
          console.warn('Partial success from create-user function:', data);
          // We'll still count this as a success but with a warning
          toast.warning(`User created but: ${data.error}`);
        }

        return data;
      } catch (err: any) {
        console.error('Error in createUserMutation:', err);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      if (data.status === 'partial_success') {
        toast.success("User created with some issues. Check logs for details.");
      } else {
        toast.success("User created successfully");
      }
      
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error in createUserMutation:', error);
      setError(error.message);
      toast.error(`Error creating user: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) {
      setError("No garage selected. Please select a garage first.");
      toast.error("No garage selected. Please select a garage first.");
      return;
    }
    
    if (!email || !password || !firstName || !lastName) {
      setError("All fields are required.");
      toast.error("All fields are required.");
      return;
    }
    
    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      toast.error("Password must be at least 6 characters.");
      return;
    }
    
    // Clear any previous error
    setError(null);
    
    try {
      await createUserMutation.mutate();
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
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
          
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {!garageId && (
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
              <p className="text-amber-800 text-sm">
                Warning: No garage is currently selected. You need to select a garage before creating users.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !garageId}
            >
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
