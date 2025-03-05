
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GarageHeaderProps {
  isMultiGarageAdmin: boolean;
}

export function GarageHeader({ isMultiGarageAdmin }: GarageHeaderProps) {
  const navigate = useNavigate();

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
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Your Garages</h1>
        <p className="text-gray-500">
          {isMultiGarageAdmin 
            ? "Select which garage you want to manage" 
            : "Select a garage to manage or create a new one"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
