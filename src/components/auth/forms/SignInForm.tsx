
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignInFormProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
}

export const SignInForm = ({ garageSlug, isOwnerView = false }: SignInFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast: uiToast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log(`Attempting to sign in with email: ${email}`);
      console.log(`Is owner view: ${isOwnerView}`);
      
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
        try {
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
            
            // Redirect to dashboard if on a garage subdomain
            navigate("/dashboard");
            return;
          }
        } catch (error) {
          console.error("Error processing garage slug:", error);
        }
      }

      // Check if the user is an administrator
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user?.id)
        .single();
        
      if (roleError) {
        console.error("Error fetching user role:", roleError);
      } else if (roleData && roleData.role === 'administrator') {
        // Administrator role or owner view, redirect to My Garages
        console.log("User is administrator or owner login, redirecting to my garages");
        toast.success("Login successful!");
        navigate("/my-garages");
      } else {
        // Non-admin role, should be redirected based on role
        console.log("Non-admin user, redirecting to dashboard");
        toast.success("Login successful!");
        navigate("/dashboard");
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

  return (
    <form onSubmit={handleSignIn} className="space-y-6">
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
        {loading ? "Loading..." : isOwnerView ? "Sign In as Owner" : "Sign In"}
      </Button>
    </form>
  );
};
