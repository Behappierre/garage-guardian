import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Role = Database['public']['Enums']['app_role'];

// Define props interface for RegisterForm
export interface RegisterFormProps {
  firstName?: string;
  setFirstName?: (value: string) => void;
  lastName?: string;
  setLastName?: (value: string) => void;
  email?: string;
  setEmail?: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
  userType?: "owner" | "staff";
  role?: Role;
  setRole?: (value: Role) => void;
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => void; // Changed type to exactly match useAuthSubmit
  navigateToOtherLogin?: () => void;
}

export const RegisterForm = ({
  firstName: propFirstName,
  setFirstName: propSetFirstName,
  lastName: propLastName,
  setLastName: propSetLastName,
  email: propEmail,
  setEmail: propSetEmail,
  password: propPassword,
  setPassword: propSetPassword,
  userType = "staff",
  role: propRole,
  setRole: propSetRole,
  isLoading: propIsLoading,
  onSubmit: propOnSubmit,
  navigateToOtherLogin
}: RegisterFormProps) => {
  const navigate = useNavigate();
  
  // Local state if props are not provided
  const [localFirstName, setLocalFirstName] = useState("");
  const [localLastName, setLocalLastName] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  const [localRole, setLocalRole] = useState<Role>("front_desk");
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Use props or local state
  const firstName = propFirstName !== undefined ? propFirstName : localFirstName;
  const setFirstName = propSetFirstName || setLocalFirstName;
  const lastName = propLastName !== undefined ? propLastName : localLastName;
  const setLastName = propSetLastName || setLocalLastName;
  const email = propEmail !== undefined ? propEmail : localEmail;
  const setEmail = propSetEmail || setLocalEmail;
  const password = propPassword !== undefined ? propPassword : localPassword;
  const setPassword = propSetPassword || setLocalPassword;
  const role = propRole !== undefined ? propRole : localRole;
  const setRole = propSetRole || setLocalRole;
  const isLoading = propIsLoading !== undefined ? propIsLoading : localIsLoading;
  
  // Handle form submission - use propOnSubmit if provided, otherwise use local handler
  const handleSubmit = (e: React.FormEvent) => {
    // If parent component provided onSubmit prop, use that
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }
    
    // Otherwise fallback to local handling (direct navigation without API calls)
    e.preventDefault();
    setFormError(null);
    
    // Just display a toast and navigate without actual API calls
    toast.success("Please use the main authentication flow instead");
    navigate("/");
  };

  // Handler to navigate to home page
  const navigateToHome = () => {
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 min-w-80">
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{formError}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
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
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
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
          disabled={isLoading}
          required
        />
      </div>
      
      {userType === "staff" && (
        <div className="space-y-2">
          <Label>Role</Label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="role"
                value="administrator"
                checked={role === "administrator"}
                onChange={() => setRole("administrator")}
                className="form-radio"
                disabled={isLoading}
              />
              <span>Administrator</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="role"
                value="technician"
                checked={role === "technician"}
                onChange={() => setRole("technician")}
                className="form-radio"
                disabled={isLoading}
              />
              <span>Technician</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="role"
                value="front_desk"
                checked={role === "front_desk"}
                onChange={() => setRole("front_desk")}
                className="form-radio"
                disabled={isLoading}
              />
              <span>Front Desk</span>
            </label>
          </div>
        </div>
      )}
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </Button>
      
      <Button 
        type="button" 
        variant="outline" 
        onClick={navigateToHome} 
        className="w-full mt-2"
        disabled={isLoading}
      >
        Back to Login
      </Button>
    </form>
  );
};
