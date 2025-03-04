
import { Button } from "@/components/ui/button";
import { GarageForm } from "@/components/auth/GarageForm";
import { supabase } from "@/integrations/supabase/client";

interface CreateGarageFormProps {
  onBack: () => void;
  onComplete: (garageId: string) => void;
}

export const CreateGarageForm = ({ onBack, onComplete }: CreateGarageFormProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <Button 
        variant="outline" 
        className="absolute top-4 left-4"
        onClick={onBack}
      >
        Back to Garages
      </Button>
      
      <GarageForm 
        userId={(supabase.auth.getUser() as any).data?.user?.id || ""} 
        onComplete={onComplete} 
      />
    </div>
  );
};
