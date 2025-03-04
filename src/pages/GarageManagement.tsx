
import { useState, useEffect } from "react";
import { useGarages } from "@/hooks/garage/useGarages";
import { useGarageSelection } from "@/hooks/garage/useGarageSelection";
import { useAdminAccessCheck } from "@/hooks/garage/useAdminAccessCheck";
import { CheckingAccessLoader } from "@/components/garage/CheckingAccessLoader";
import { GarageLoadingState } from "@/components/garage/GarageLoadingState";
import { GarageContent } from "@/components/garage/GarageContent";
import { CreateGarageForm } from "@/components/garage/CreateGarageForm";
import { supabase } from "@/integrations/supabase/client";

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
      const { data } = await supabase.auth.getUser();
      setUserData(data.user);
    };
    
    getUserData();
  }, []);

  // Check if user has any garages right after access check completes
  useEffect(() => {
    if (!checkingAccess && garages.length === 0 && !loading) {
      console.log("User has no garages, showing create form");
      setShowCreateForm(true);
    }
  }, [checkingAccess, garages.length, loading]);

  // Handle garage creation completion
  const handleGarageCreated = (garageId: string) => {
    console.log("Garage created, refreshing list:", garageId);
    refreshGarages();
    setShowCreateForm(false);
  };

  if (checkingAccess) {
    console.log("Rendering loading state while checking access");
    return <CheckingAccessLoader />;
  }

  if (loading) {
    console.log("Rendering loading state while fetching garages");
    return <GarageLoadingState />;
  }

  // If no garages exist, show the create form automatically
  if (garages.length === 0 && !showCreateForm) {
    console.log("No garages found, showing create form");
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <CreateGarageForm 
          onBack={() => {}} // Empty function since there's no back state
          onComplete={handleGarageCreated}
          userId={userData?.id}
        />
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateGarageForm 
        onBack={() => setShowCreateForm(false)}
        onComplete={handleGarageCreated}
        userId={userData?.id}
      />
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
