
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

type AuthMode = "signin" | "signup";
type Role = "administrator" | "technician" | "front_desk";

interface Garage {
  id: string;
  name: string;
  slug: string;
}

export const AuthForm = () => {
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
  const { toast } = useToast();

  useEffect(() => {
    const fetchGarages = async () => {
      try {
        setFetchingGarages(true);
        const { data, error } = await supabase
          .from('garages')
          .select('id, name, slug');
        
        if (error) throw error;
        
        setGarages(data || []);
        // Set default garage if available (in this case, look for Tractic)
        const tracticGarage = data?.find(garage => garage.name === 'Tractic');
        if (tracticGarage) {
          setSelectedGarageId(tracticGarage.id);
        } else if (data && data.length > 0) {
          setSelectedGarageId(data[0].id);
        }
      } catch (error: any) {
        console.error("Error fetching garages:", error.message);
      } finally {
        setFetchingGarages(false);
      }
    };

    fetchGarages();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGarageId) {
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
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // After successful sign in, verify user belongs to the selected garage
        if (signInData.user) {
          const { data: garageMemberData, error: garageMemberError } = await supabase
            .from('garage_members')
            .select('garage_id')
            .eq('user_id', signInData.user.id)
            .eq('garage_id', selectedGarageId);
          
          if (garageMemberError) throw garageMemberError;
          
          // If user doesn't belong to the selected garage, sign out and show error
          if (!garageMemberData || garageMemberData.length === 0) {
            await supabase.auth.signOut();
            throw new Error("You don't have access to the selected garage. Please select the correct garage or contact an administrator.");
          }

          // If verification passes, fetch user role and redirect
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', signInData.user.id)
            .single();

          if (roleError) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Error fetching user role",
            });
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{mode === "signin" ? "Sign In" : "Create Account"}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signin" ? "Welcome back!" : "Join GarageGuardian today"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="mt-8 space-y-6">
        {/* Garage Selection - shown for both sign in and sign up */}
        <div className="space-y-2">
          <Label htmlFor="garage">Select Garage</Label>
          <Select 
            value={selectedGarageId} 
            onValueChange={setSelectedGarageId}
            disabled={fetchingGarages}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={fetchingGarages ? "Loading garages..." : "Select a garage"} />
            </SelectTrigger>
            <SelectContent>
              {garages.map((garage) => (
                <SelectItem key={garage.id} value={garage.id}>
                  {garage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        <Button type="submit" className="w-full" disabled={loading || !selectedGarageId}>
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
