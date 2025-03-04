
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
}

export const GarageContent = ({ 
  garages, 
  loading, 
  error, 
  debugInfo,
  onSelectGarage,
  refreshGarages
}: GarageContentProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleGarageCreated = (garageId: string) => {
    console.log("Garage created, refreshing list:", garageId);
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <PageHeader 
          title="Your Garages" 
          description="Select a garage to manage or create a new one"
        />
        
        <GarageAlerts 
          debugInfo={debugInfo} 
          error={error} 
          garagesEmpty={garages.length === 0} 
        />
        
        <GarageList 
          garages={garages}
          loading={loading}
          onSelectGarage={onSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
        />
        
        {showCreateForm && (
          <CreateGarageForm 
            onBack={() => setShowCreateForm(false)}
            onComplete={handleGarageCreated}
          />
        )}
        
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
