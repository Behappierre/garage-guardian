
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { GarageAlerts } from "./GarageAlerts";
import { GarageList } from "./GarageList";
import { CreateGarageForm } from "./CreateGarageForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
}

interface GarageContentProps {
  garages: Garage[];
  loading: boolean;
  error: string | null;
  debugInfo: string | null;
  onSelectGarage: (garageId: string) => Promise<void>;
  refreshGarages: () => void;
  onCreateGarage?: () => void;
}

export const GarageContent = ({ 
  garages, 
  loading, 
  error, 
  debugInfo,
  onSelectGarage,
  refreshGarages,
  onCreateGarage
}: GarageContentProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleGarageCreated = (garageId: string) => {
    console.log("Garage created, refreshing list:", garageId);
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  const handleCreateClick = () => {
    if (onCreateGarage) {
      onCreateGarage();
    } else {
      setShowCreateForm(true);
    }
  };

  if (showCreateForm) {
    return (
      <CreateGarageForm 
        onBack={() => setShowCreateForm(false)}
        onComplete={handleGarageCreated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <PageHeader 
          title="Your Garages" 
          description={garages.length > 0 
            ? "Select a garage to manage or create a new one"
            : "Get started by creating your first garage"
          }
        />
        
        <GarageAlerts 
          debugInfo={debugInfo} 
          error={error} 
          isMultiGarageAdmin={garages.length > 1} 
        />
        
        <GarageList 
          garages={garages}
          loading={loading}
          onSelectGarage={onSelectGarage}
          onCreateGarage={handleCreateClick}
        />
        
        {garages.length === 0 && !loading && (
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={handleCreateClick}
              className="mt-4"
            >
              Create Your First Garage
            </Button>
          </div>
        )}
        
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
