
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setUserRole(data.role);
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error fetching user role",
          description: error.message
        });
      }
    };

    fetchUserRole();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
            </Button>
            <span className="text-xl font-semibold text-primary ml-2">GarageGuardian</span>
          </div>
          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
            
            {user && (
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            )}

            {userRole === 'administrator' && (
              <>
                <Button variant="ghost">Users</Button>
                <Button variant="ghost">Settings</Button>
              </>
            )}

            {userRole === 'technician' && (
              <>
                <Button variant="ghost">Repairs</Button>
                <Button variant="ghost">Inventory</Button>
              </>
            )}

            {userRole === 'front_desk' && (
              <>
                <Button variant="ghost">Appointments</Button>
                <Button variant="ghost">Customers</Button>
              </>
            )}

            {user ? (
              <Button variant="default" onClick={handleSignOut}>Sign Out</Button>
            ) : (
              <Button variant="default" onClick={() => navigate("/auth")}>Sign In</Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
