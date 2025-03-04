
import { useState, useEffect } from "react";
import { useGarages } from "@/hooks/garage/useGarages";
import { useGarageSelection } from "@/hooks/garage/useGarageSelection";
import { useAdminAccessCheck } from "@/hooks/garage/useAdminAccessCheck";
import { CheckingAccessLoader } from "@/components/garage/CheckingAccessLoader";
import { GarageLoadingState } from "@/components/garage/GarageLoadingState";
import { GarageContent } from "@/components/garage/GarageContent";
import { CreateGarageForm } from "@/components/garage/CreateGarageForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GarageManagement = () => {
  const { garages, loading, error, refreshGarages } = useGarages();
  const { selectGarage, debugInfo: selectionDebugInfo } = useGarageSelection();
  const { checkingAccess, accessGranted, debugInfo: accessDebugInfo } = useAdminAccessCheck();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  // Combine debug info from different sources
  const debugInfo = selectionDebugInfo || accessDebugInfo;

  // Get current user data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error fetching user data:", error.message);
          return;
        }
        setUserData(data.user);
        console.log("Current user:", data.user);
      } catch (err) {
        console.error("Exception fetching user data:", err);
      }
    };
    
    getUserData();
  }, []);

  // Check if user has any garages right after access check completes
  useEffect(() => {
    if (!checkingAccess && !loading && accessGranted) {
      if (garages.length === 0) {
        console.log("User has no garages, showing create form");
        setShowCreateForm(true);
      }
    }
  }, [checkingAccess, loading, garages.length, accessGranted]);

  // Handle garage creation completion
  const handleGarageCreated = (garageId: string) => {
    console.log("Garage created, refreshing list:", garageId);
    toast.success("Garage created successfully");
    refreshGarages();
    setShowCreateForm(false);
  };

  if (checkingAccess) {
    console.log("Rendering loading state while checking access");
    return <CheckingAccessLoader />;
  }

  if (!accessGranted) {
    console.log("Access not granted, user should be redirected");
    return <CheckingAccessLoader />;
  }

  if (loading) {
    console.log("Rendering loading state while fetching garages");
    return <GarageLoadingState />;
  }

  // Show the create form if explicitly requested or if user has no garages
  if (showCreateForm || garages.length === 0) {
    console.log("Showing create form");
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <CreateGarageForm 
          onBack={() => garages.length > 0 ? setShowCreateForm(false) : {}} 
          onComplete={handleGarageCreated}
          userId={userData?.id}
        />
      </div>
    );
  }

  return (
    <GarageContent 
      garages={garages}
      loading={loading}
      error={error}
      debugInfo={debugInfo}
      onSelectGarage={selectGarage}
      refreshGarages={refreshGarages}
      onCreateGarage={() => setShowCreateForm(true)}
    />
  );
};

export default GarageManagement;
