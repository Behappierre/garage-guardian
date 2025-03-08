
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  userType: "owner" | "staff";
  navigateToOtherLogin: () => void;
}

export const LoginForm = ({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  onToggleMode,
  userType,
  navigateToOtherLogin
}: LoginFormProps) => {
  const navigate = useNavigate();
  
  // Handle sign up link click based on user type
  const handleSignUpClick = () => {
    if (userType === "owner") {
      // Owner sign-in page - regular toggle to registration
      onToggleMode();
    } else {
      // Staff sign-in page - redirect to owner registration
      navigate("/auth?type=owner");
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
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
        {loading ? "Loading..." : "Sign In"}
      </Button>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={handleSignUpClick}
          className="text-primary hover:underline"
        >
          Don't have an account? Sign up
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
