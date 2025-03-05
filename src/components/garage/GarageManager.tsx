
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { GaragesList } from "./GaragesList";
import { NewGarageForm } from "./NewGarageForm";
import { EditGarageDetailsDialog } from "./EditGarageDetailsDialog";
import { DeleteGarageDialog } from "./DeleteGarageDialog";
import { GarageHeader } from "./GarageHeader";
import { GarageAlerts } from "./GarageAlerts";
import { EmptyGarageState } from "./EmptyGarageState";
import { exportGarageData } from "./GarageDataExporter";
import { selectGarage } from "./GarageSelector";
import { useOwnerGarages } from "@/hooks/useOwnerGarages";
import type { Garage } from "@/types/garage";

export const GarageManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { garages, isLoading, error, refreshGarages } = useOwnerGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isMultiGarageAdmin, setIsMultiGarageAdmin] = useState(false);
  const [loginSource, setLoginSource] = useState<"owner" | "staff" | null>(null);
  const [selectedGarageId, setSelectedGarageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const source = params.get('source');
    
    if (source === 'staff') {
      console.log("User came from staff login, setting multi-garage mode");
      setLoginSource('staff');
      setIsMultiGarageAdmin(true);
    } else {
      setLoginSource('owner');
    }
  }, [garages, location]);

  const handleGarageCreated = (garageId: string) => {
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  const handleSelectGarage = (garageId: string) => {
    selectGarage(garageId, navigate);
  };

  const handleEditDetails = (garage: Garage) => {
    setSelectedGarage(garage);
    setShowEditDialog(true);
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
      <GarageHeader isMultiGarageAdmin={isMultiGarageAdmin} />

      <GarageAlerts error={error} isMultiGarageAdmin={isMultiGarageAdmin} />
      
      {garages.length === 0 && !isLoading ? (
        <EmptyGarageState onCreateGarage={() => setShowCreateForm(true)} />
      ) : (
        <GaragesList
          garages={garages}
          isLoading={isLoading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
          onSettingsClick={(garageId) => setSelectedGarageId(garageId)}
          onExportData={exportGarageData}
          onDeleteClick={(garageId) => {
            setSelectedGarageId(garageId);
            setShowDeleteDialog(true);
          }}
          onEditDetails={handleEditDetails}
        />
      )}

      <DeleteGarageDialog
        garageId={selectedGarageId}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onGarageDeleted={refreshGarages}
      />
      
      <EditGarageDetailsDialog
        garage={selectedGarage}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onGarageUpdated={refreshGarages}
      />
    </div>
  );
};
