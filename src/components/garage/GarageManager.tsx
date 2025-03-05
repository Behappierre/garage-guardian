
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GaragesList } from "./GaragesList";
import { NewGarageForm } from "./NewGarageForm";
import { useOwnerGarages } from "@/hooks/useOwnerGarages";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const GarageManager = () => {
  const navigate = useNavigate();
  const { garages, isLoading, error, refreshGarages } = useOwnerGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isMultiGarageAdmin, setIsMultiGarageAdmin] = useState(false);
  const [loginSource, setLoginSource] = useState<"owner" | "staff" | null>(null);
  
  // Check if user came from staff login or owner login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source === 'staff') {
      setLoginSource('staff');
      setIsMultiGarageAdmin(true);
    } else {
      setLoginSource('owner');
    }
  }, []);
  
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

  const handleGarageCreated = (garageId: string) => {
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  const handleSelectGarage = async (garageId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Unable to detect user for garage association");
        return;
      }
      
      const { error: membershipError } = await supabase
        .from('garage_members')
        .upsert({
          user_id: userData.user.id,
          garage_id: garageId,
          role: 'owner'
        }, {
          onConflict: 'user_id,garage_id'
        });
        
      if (membershipError) {
        console.error("Error creating garage membership:", membershipError);
        toast.error("Failed to associate with garage");
        return;
      }
      
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ garage_id: garageId })
        .eq('user_id', userData.user.id);
        
      if (roleError) {
        console.error("Error updating user role:", roleError);
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userData.user.id);
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
      
      toast.success("Successfully associated with garage");
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error selecting garage:", error);
      toast.error("Failed to select garage");
    }
  };

  if (showCreateForm) {
    return (
      <NewGarageForm
        onBack={() => setShowCreateForm(false)} 
        onComplete={handleGarageCreated}
      />
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Garages</h1>
          <p className="text-gray-500">
            {isMultiGarageAdmin 
              ? "Select which garage you want to manage" 
              : garages.length > 0 
                ? "Select a garage to manage or create a new one" 
                : "Get started by creating your first garage"}
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isMultiGarageAdmin && (
        <Alert className="mb-6">
          <AlertTitle>Multiple Garages Detected</AlertTitle>
          <AlertDescription>
            You have access to multiple garages. Please select which garage you want to manage.
          </AlertDescription>
        </Alert>
      )}

      {garages.length === 0 && !isLoading ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h2 className="text-xl font-semibold mb-4">No Garages Found</h2>
          <p className="text-gray-500 mb-6">Create your first garage to get started</p>
          <Button onClick={() => setShowCreateForm(true)}>Create Your First Garage</Button>
        </div>
      ) : (
        <GaragesList
          garages={garages}
          isLoading={isLoading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
        />
      )}
    </div>
  );
};
