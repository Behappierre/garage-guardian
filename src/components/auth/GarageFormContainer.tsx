
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GarageForm } from "./GarageForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface GarageFormContainerProps {
  userId: string;
  userType: "owner" | "staff";
  onComplete?: () => void;
}

export const GarageFormContainer = ({ userId, userType, onComplete }: GarageFormContainerProps) => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGarageCreated = async (garageId: string) => {
    console.log(`Garage created with ID ${garageId} for user ${userId}`);
    
    try {
      // For owner accounts, always navigate to garage management
      if (userType === "owner") {
        navigate("/garage-management");
      } else if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error("Error after garage creation:", error);
      setError(error.message || "An error occurred after creating your garage");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full mx-auto my-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Create Your Garage</h2>
        <p className="text-gray-600 mt-1">
          Set up your garage details to get started
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <GarageForm userId={userId} onComplete={handleGarageCreated} />
    </div>
  );
};
