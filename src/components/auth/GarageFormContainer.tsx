
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
  return <GarageForm userId={userId} onComplete={onComplete} />;
};
