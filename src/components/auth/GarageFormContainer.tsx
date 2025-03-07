
import { useNavigate } from "react-router-dom";
import { GarageForm } from "./GarageForm";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  
  // Define a safe callback wrapper to ensure onComplete is a function before calling it
  const handleComplete = (garageId: string) => {
    if (typeof onComplete === 'function') {
      onComplete(garageId);
    } else {
      // Default behavior if onComplete is not provided
      toast.success("Garage created successfully!");
      
      // Route based on user type
      if (userType === "owner") {
        navigate('/garage-management');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return <GarageForm userId={userId} onComplete={handleComplete} />;
};
