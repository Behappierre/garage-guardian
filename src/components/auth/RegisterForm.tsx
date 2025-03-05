
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Role = "administrator" | "technician" | "front_desk";

interface RegisterFormProps {
  firstName: string;
  setFirstName: (name: string) => void;
  lastName: string;
  setLastName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  role: Role;
  setRole: (role: Role) => void;
  userType: "owner" | "staff";
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  navigateToOtherLogin: () => void;
}

export const RegisterForm = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  role,
  setRole,
  userType,
  loading,
  onSubmit,
  onToggleMode,
  navigateToOtherLogin
}: RegisterFormProps) => {
  // Only render the registration form for owner type
  if (userType === "staff") {
    return (
      <div className="mt-8 space-y-6 text-center">
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-800">
          <p>Staff accounts can only be created by garage administrators.</p>
          <p className="mt-2">Please contact your garage administrator for access.</p>
        </div>
        
        <Button 
          onClick={onToggleMode} 
          className="w-full"
        >
          Sign In Instead
        </Button>
        
        <div className="text-center text-sm pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={navigateToOtherLogin}
            className="text-gray-600 hover:underline"
          >
            Return to Home Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
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

      {/* This is where the error was occurring - Fixed by ensuring proper type comparison */}
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
        {loading ? "Loading..." : "Sign Up"}
      </Button>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-primary hover:underline"
        >
          Already have an account? Sign in
        </button>
      </div>

      <div className="text-center text-sm pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={navigateToOtherLogin}
          className="text-gray-600 hover:underline"
        >
          {userType === "owner" 
            ? "Sign in as Staff Member instead" 
            : "Return to Home Page"}
        </button>
      </div>
    </form>
  );
};
