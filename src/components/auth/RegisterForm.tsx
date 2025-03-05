
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSignUp } from "@/hooks/auth/useSignUp";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Role = Database['public']['Enums']['app_role'];
type UserType = "owner" | "staff";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const [userType, setUserType] = useState<UserType>("staff");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signUp } = useSignUp();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!email || !password || !firstName || !lastName) {
      toast.error("All fields are required");
      setLoading(false);
      return;
    }
    
    try {
      const user = await signUp(email, password, firstName, lastName, role, userType);
      
      if (user) {
        if (userType === "owner") {
          // Redirect to garage creation flow for owners
          navigate("/garage-form");
        } else {
          // Staff will be automatically assigned to a garage, so redirect to login
          navigate("/login", { state: { message: "Account created successfully! Please sign in." } });
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <div className="space-y-4">
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
          <Label>I am a:</Label>
          <RadioGroup 
            value={userType} 
            onValueChange={(value: UserType) => setUserType(value)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="owner" id="owner" />
              <Label htmlFor="owner">Garage Owner</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="staff" id="staff" />
              <Label htmlFor="staff">Staff Member</Label>
            </div>
          </RadioGroup>
        </div>
        
        {userType === "staff" && (
          <div className="space-y-2">
            <Label>Role:</Label>
            <RadioGroup 
              value={role} 
              onValueChange={(value: Role) => setRole(value)}
              className="flex flex-col space-y-1"
            >
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
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
