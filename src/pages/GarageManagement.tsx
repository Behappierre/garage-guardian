
import { useState } from "react";
import { useGarages } from "@/hooks/garage/useGarages";
import { useGarageSelection } from "@/hooks/garage/useGarageSelection";
import { useAdminAccessCheck } from "@/hooks/garage/useAdminAccessCheck";
import { CheckingAccessLoader } from "@/components/garage/CheckingAccessLoader";
import { GarageLoadingState } from "@/components/garage/GarageLoadingState";
import { GarageContent } from "@/components/garage/GarageContent";

const GarageManagement = () => {
  const { garages, loading, error, refreshGarages } = useGarages();
  const { selectGarage, debugInfo: selectionDebugInfo } = useGarageSelection();
  const { checkingAccess, accessGranted, debugInfo: accessDebugInfo } = useAdminAccessCheck();
  
  // Combine debug info from different sources
  const debugInfo = selectionDebugInfo || accessDebugInfo;

  if (checkingAccess) {
    console.log("Rendering loading state while checking access");
    return <CheckingAccessLoader />;
  }

  if (loading) {
    console.log("Rendering loading state while fetching garages");
    return <GarageLoadingState />;
  }

  return (
    <GarageContent 
      garages={garages}
      loading={loading}
      error={error}
      debugInfo={debugInfo}
      onSelectGarage={selectGarage}
      refreshGarages={refreshGarages}
    />
  );
};

export default GarageManagement;
