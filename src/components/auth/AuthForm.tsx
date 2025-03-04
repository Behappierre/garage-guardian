
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast as useUIToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast as sonnerToast } from "sonner";
import { GarageForm } from "./GarageForm";
import { Garage } from "@/types/garage";

type AuthMode = "signin" | "signup";
type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";

interface AuthFormProps {
  userType: UserType;
}

export const AuthForm = ({ userType }: AuthFormProps) => {
  const navigate = useNavigate();
  const { toast: uiToast } = useUIToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const [showGarageForm, setShowGarageForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userType === "owner") {
      setRole("administrator");
    } else {
      setRole("front_desk");
    }
  }, [userType]);

  const handleGarageCreationComplete = (garageId: string) => {
    navigate("/garage-management");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const userRole = userType === "owner" ? "administrator" : role;
        
        console.log(`Signing up user with role: ${userRole}`);
        
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

        if (signUpData.user) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert([
              { 
                user_id: signUpData.user.id,
                role: userRole
              }
            ]);
          if (roleError) throw roleError;
          
          if (userType === "owner") {
            setNewUserId(signUpData.user.id);
            setShowGarageForm(true);
            
            await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            uiToast({
              title: "Account created!",
              description: "Now let's set up your garage.",
            });
          } else {
            // For staff users, find a default garage to assign
            const { data: defaultGarage, error: defaultGarageError } = await supabase
              .from('garages')
              .select('id')
              .eq('slug', 'tractic')
              .limit(1);
              
            if (defaultGarageError) {
              console.error("Error finding default garage:", defaultGarageError);
              throw new Error("Could not find a default garage to assign you to");
            }
            
            let garageId = null;
            if (defaultGarage && defaultGarage.length > 0) {
              garageId = defaultGarage[0].id;
            } else {
              // If no default garage exists, find any available garage
              const { data: anyGarage, error: anyGarageError } = await supabase
                .from('garages')
                .select('id')
                .limit(1);
                
              if (anyGarageError) {
                throw new Error("Could not find any garage to assign you to");
              }
              
              if (anyGarage && anyGarage.length > 0) {
                garageId = anyGarage[0].id;
              } else {
                throw new Error("No garages exist in the system. Please contact an administrator.");
              }
            }
            
            // Assign the user to the garage
            const { error: garageMemberError } = await supabase
              .from('garage_members')
              .insert([
                {
                  user_id: signUpData.user.id,
                  garage_id: garageId,
                  role: role
                }
              ]);
            if (garageMemberError) throw garageMemberError;
            
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ garage_id: garageId })
              .eq('id', signUpData.user.id);
            if (profileError) throw profileError;
            
            // Sign in the user after successful signup
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (signInError) throw signInError;
            
            // Redirect based on role
            if (role === 'technician') {
              navigate("/dashboard/job-tickets");
            } else {
              navigate("/dashboard/appointments");
            }
          }
        }
      } else {
        // SIGN IN FLOW
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (signInData.user) {
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', signInData.user.id)
              .maybeSingle();

            if (roleError) {
              console.error("Error fetching user role:", roleError.message);
              throw new Error("Could not verify your account role");
            }

            console.log("User role check for access:", roleData?.role, "Trying to access as:", userType);

            if (userType === "owner") {
              if (roleData?.role !== 'administrator') {
                throw new Error("You don't have permission to access the garage owner area");
              }
              
              navigate("/garage-management");
              return;
            }

            if (userType === "staff" && roleData?.role === 'administrator') {
              throw new Error("Administrators should use the garage owner login");
            }
            
            if (roleData?.role) {
              // Ensure we have a garage_id for the user
              const { data: profileData } = await supabase
                .from('profiles')
                .select('garage_id')
                .eq('id', signInData.user.id)
                .single();
                
              if (!profileData?.garage_id) {
                // If profile doesn't have a garage_id, check memberships
                const { data: memberData } = await supabase
                  .from('garage_members')
                  .select('garage_id')
                  .eq('user_id', signInData.user.id)
                  .limit(1);
                  
                if (memberData && memberData.length > 0) {
                  // Update profile with the found garage_id
                  await supabase
                    .from('profiles')
                    .update({ garage_id: memberData[0].garage_id })
                    .eq('id', signInData.user.id);
                }
              }
              
              // Now redirect based on role
              switch (roleData.role) {
                case 'technician':
                  navigate("/dashboard/job-tickets");
                  break;
                case 'front_desk':
                  navigate("/dashboard/appointments");
                  break;
                default:
                  navigate("/dashboard");
              }
            } else {
              throw new Error("Your account does not have an assigned role");
            }
          } catch (error: any) {
            console.error("Error during sign-in flow:", error.message);
            uiToast({
              variant: "destructive",
              title: "Access Denied",
              description: error.message,
            });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error.message);
      uiToast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (showGarageForm && newUserId) {
    return <GarageForm userId={newUserId} onComplete={handleGarageCreationComplete} />;
  }

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {userType === "owner" 
            ? (mode === "signin" ? "Garage Owner Sign In" : "Create Garage Owner Account") 
            : (mode === "signin" ? "Staff Sign In" : "Create Staff Account")}
        </h2>
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

            {userType === "staff" && (
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
            )}
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

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
        >
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

        <div className="text-center text-sm pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(userType === "owner" ? "/auth?type=staff" : "/")}
            className="text-gray-600 hover:underline"
          >
            {userType === "owner" 
              ? "Sign in as Staff Member instead" 
              : "Return to Home Page"}
          </button>
        </div>
      </form>
    </div>
  );
};
