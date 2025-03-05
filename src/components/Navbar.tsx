
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { GarageSwitcher } from "@/components/garage/GarageSwitcher";

export const Navbar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [userInitials, setUserInitials] = useState("U");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) return;
      
      // Set email from user object
      setUserEmail(user.email || "");
      
      // Get user profile for name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileData) {
        const firstInitial = profileData.first_name?.[0] || '';
        const lastInitial = profileData.last_name?.[0] || '';
        
        if (firstInitial || lastInitial) {
          setUserInitials((firstInitial + lastInitial).toUpperCase());
        } else {
          // If no name, use first letter of email
          setUserInitials((user.email?.[0] || 'U').toUpperCase());
        }
      } else {
        // If no profile, use first letter of email
        setUserInitials((user.email?.[0] || 'U').toUpperCase());
      }
    };
    
    fetchUserDetails();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center">
          <Link 
            to="/dashboard" 
            className="flex items-center text-xl font-semibold text-primary"
          >
            <img 
              src="/lovable-uploads/e33cb773-8a89-43de-82f8-1026ab6337c3.png" 
              alt="Tractic Logo" 
              className="mr-2 h-8 w-8" 
            />
            Tractic
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Garage Switcher Component */}
          <GarageSwitcher />
          
          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src="" alt={userEmail} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userEmail}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/admin")}>
                  Admin Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};
