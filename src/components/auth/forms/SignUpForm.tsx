
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Role = "administrator" | "technician" | "front_desk";

interface SignUpFormProps {
  garageSlug?: string | null;
}

export const SignUpForm = ({ garageSlug }: SignUpFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const { toast: uiToast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      if (signUpError) throw signUpError;

      // If we have the user data, insert the role
      if (signUpData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([
            { 
              user_id: signUpData.user.id,
              role: role
            }
          ]);
        if (roleError) throw roleError;
        
        // If a garage slug was provided, try to associate the user with this garage
        if (garageSlug) {
          // Get the garage ID for the provided slug
          const { data: garageData, error: garageError } = await supabase
            .from('garages')
            .select('id')
            .eq('slug', garageSlug)
            .single();
            
          if (garageError) {
            console.error("Error fetching garage:", garageError);
          } else if (garageData) {
            // Associate the user with this garage as a regular user
            const { error: memberError } = await supabase
              .from('garage_members')
              .insert([{
                user_id: signUpData.user.id,
                garage_id: garageData.id,
                role: 'front_desk' // Default role for new users
              }]);
              
            if (memberError) {
              console.error("Error associating user with garage:", memberError);
            }
          }
        }
      }

      uiToast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
    } catch (error: any) {
      console.error("Authentication error:", error);
      uiToast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-6">
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
        <Label>Select Your Role</Label>
        <RadioGroup value={role} onValueChange={(value) => setRole(value as Role)} className="grid grid-cols-1 gap-2">
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Loading..." : "Sign Up"}
      </Button>
    </form>
  );
};
