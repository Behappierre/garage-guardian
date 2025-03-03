
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";
type Role = "administrator" | "technician" | "front_desk";

interface AuthFormProps {
  garageSlug?: string | null;
}

export const AuthForm = ({ garageSlug }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const { toast: uiToast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
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
      } else {
        console.log(`Attempting to sign in with email: ${email}`);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error("Sign in error:", error);
          throw error;
        }
        
        console.log("Sign in successful:", data);
        
        // If a garage slug was provided, store it for the Auth component to use
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
            console.log(`Setting current garage ID to: ${garageData.id}`);
            localStorage.setItem("currentGarageId", garageData.id);
            toast.success(`Logged in to ${garageSlug} garage`);
          }
        }

        // Success notification
        toast.success("Login successful! Redirecting...");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(`Login failed: ${error.message}`);
      uiToast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine the form title based on mode and whether there's a garage
  const getFormTitle = () => {
    if (garageSlug) {
      return mode === "signin" ? "Sign In to Your Garage" : "Create Garage Account";
    }
    return mode === "signin" ? "Garage Owner Sign In" : "Create Owner Account";
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{getFormTitle()}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signin" ? "Welcome back!" : "Join GarageWizz today"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="mt-8 space-y-6">
        {mode === "signup" && (
          <>
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
          </>
        )}

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
          {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </Button>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary hover:underline"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
};
