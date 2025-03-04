
import { useState } from "react";
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
  const [showCreateForm, setShowCreateForm] = useState(garages.length === 0);

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

  const handleSelectGarage = (garageId: string) => {
    // Here you would normally navigate to the garage dashboard or set it as the active garage
    toast.success("Selected garage: " + garageId);
    // For now, we're just showing a toast
  };

  if (showCreateForm) {
    return (
      <NewGarageForm
        onBack={() => garages.length > 0 ? setShowCreateForm(false) : {}} 
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
            {garages.length > 0 
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
