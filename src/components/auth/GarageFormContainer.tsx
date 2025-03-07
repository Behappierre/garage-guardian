
import { GarageForm } from "./GarageForm";

interface GarageFormContainerProps {
  userId: string;
  userType: "owner" | "staff";
  onComplete?: (garageId: string) => void;
}

export const GarageFormContainer = ({ 
  userId, 
  userType,
  onComplete 
}: GarageFormContainerProps) => {
  // Define a safe callback wrapper to ensure onComplete is a function before calling it
  const handleComplete = (garageId: string) => {
    if (typeof onComplete === 'function') {
      onComplete(garageId);
    }
  };

  return <GarageForm userId={userId} onComplete={handleComplete} />;
};
