
import { GarageForm } from "./GarageForm";

interface GarageFormContainerProps {
  userId: string;
  onComplete: (garageId: string) => void;
}

export const GarageFormContainer = ({ 
  userId, 
  onComplete 
}: GarageFormContainerProps) => {
  return <GarageForm userId={userId} onComplete={onComplete} />;
};
