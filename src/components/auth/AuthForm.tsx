
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GarageForm } from "./GarageForm";

type AuthMode = "signin" | "signup";
type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";

interface Garage {
  id: string;
  name: string;
  slug: string;
}

interface AuthFormProps {
  userType: UserType;
}

export const AuthForm = ({ userType }: AuthFormProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const [garages, setGarages] = useState<Garage[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>("");
  const [fetchingGarages, setFetchingGarages] = useState(true);
  const [showGarageForm, setShowGarageForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set default role based on user type
  useEffect(() => {
    if (userType === "owner") {
      setRole("administrator");
    } else {
      setRole("front_desk");
    }
  }, [userType]);

  useEffect(() => {
    const fetchGarages = async () => {
      try {
        setFetchingGarages(true);
        
        // Use direct database access bypassing RLS policies completely
        const { data, error } = await supabase.rpc('execute_read_only_query', {
          query_text: 'SELECT id, name, slug FROM garages ORDER BY name'
        });
        
        if (error) throw error;
        
        // Parse the jsonb result
        let parsedGarages: Garage[] = [];
        if (data && Array.isArray(data)) {
          parsedGarages = data.map(row => {
            // Since row is of type Json, we need to safely access properties
            const jsonRow = row as Record<string, any>;
            return {
              id: jsonRow.id as string,
              name: jsonRow.name as string,
              slug: jsonRow.slug as string
            };
          });
        }
        
        console.log("Fetched garages:", parsedGarages);
        
        if (parsedGarages.length > 0) {
          setGarages(parsedGarages);
          // Always look for Tractic garage first
          const tracticGarage = parsedGarages.find(garage => 
            garage.name.toLowerCase() === 'tractic' || 
            garage.slug.toLowerCase() === 'tractic'
          );
          
          if (tracticGarage) {
            setSelectedGarageId(tracticGarage.id);
          } else {
            // Otherwise use the first garage in the list
            setSelectedGarageId(parsedGarages[0].id);
          }
        } else {
          // Fallback option if no garages are found
          const fallbackGarages: Garage[] = [
            { id: "00000000-0000-0000-0000-000000000000", name: "Tractic", slug: "tractic" }
          ];
          setGarages(fallbackGarages);
          setSelectedGarageId(fallbackGarages[0].id);
        }
      } catch (error: any) {
        console.error("Error fetching garages:", error.message);
        
        // Fallback to hardcoded Tractic garage in case of any errors
        const fallbackGarages: Garage[] = [
          { id: "00000000-0000-0000-0000-000000000000", name: "Tractic", slug: "tractic" }
        ];
        setGarages(fallbackGarages);
        setSelectedGarageId(fallbackGarages[0].id);
        
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Could not load garages. Using default garage.",
        });
      } finally {
        setFetchingGarages(false);
      }
    };

    fetchGarages();
  }, []);

  const handleGarageCreationComplete = (garageId: string) => {
    // After garage creation, proceed to dashboard
    navigate("/dashboard");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userType === "staff" && !selectedGarageId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a garage.",
      });
      return;
    }
    
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
          
          if (userType === "owner") {
            // For garage owners, show the garage creation form
            setNewUserId(signUpData.user.id);
            setShowGarageForm(true);
          } else {
            // For staff, add them to an existing garage
            // Add user to garage_members table
            const { error: garageMemberError } = await supabase
              .from('garage_members')
              .insert([
                {
                  user_id: signUpData.user.id,
                  garage_id: selectedGarageId,
                  role: role
                }
              ]);
            if (garageMemberError) throw garageMemberError;
            
            // Update user's profile with garage_id
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ garage_id: selectedGarageId })
              .eq('id', signUpData.user.id);
            if (profileError) throw profileError;
          }

          toast({
            title: "Success!",
            description: "Please check your email to confirm your account.",
          });
        }
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // After successful sign in, we'll handle the garage association directly in AuthProvider
        // This avoids the RLS infinite recursion issues when checking garage memberships
        if (signInData.user) {
          try {
            // Update the user's profile with the selected garage
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ garage_id: selectedGarageId })
              .eq('id', signInData.user.id);
            
            if (profileError && !profileError.message.includes("infinite recursion")) {
              console.error("Non-critical error updating profile:", profileError.message);
            }
          } catch (updateError) {
            console.error("Error updating profile garage:", updateError);
            // Continue with sign-in process even if this fails
          }

          // Fetch user role and redirect
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', signInData.user.id)
            .single();

          if (roleError) {
            console.error("Error fetching user role:", roleError.message);
            // Default redirect if role fetch fails
            navigate("/dashboard");
            return;
          }

          // Redirect based on role
          switch (roleData?.role) {
            case 'administrator':
              navigate("/dashboard");
              break;
            case 'technician':
              navigate("/dashboard/job-tickets");
              break;
            case 'front_desk':
              navigate("/dashboard/appointments");
              break;
            default:
              navigate("/dashboard");
          }
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error.message);
      toast({
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
        {/* Garage Selection - Only shown for staff */}
        {userType === "staff" && (
          <div className="space-y-2">
            <Label htmlFor="garage">Select Garage</Label>
            <Select 
              value={selectedGarageId} 
              onValueChange={setSelectedGarageId}
              disabled={fetchingGarages}
            >
              <SelectTrigger className="w-full">
                <SelectValue 
                  placeholder={fetchingGarages ? "Loading garages..." : "Select a garage"} 
                />
              </SelectTrigger>
              <SelectContent>
                {garages.length > 0 ? (
                  garages.map((garage) => (
                    <SelectItem key={garage.id} value={garage.id}>
                      {garage.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-garages" disabled>
                    No garages available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

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
          disabled={loading || (userType === "staff" && !selectedGarageId)}
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

        {/* Link to switch between owner and staff forms */}
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
