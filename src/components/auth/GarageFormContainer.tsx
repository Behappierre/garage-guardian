
import { GarageForm } from "./GarageForm";
import { useNavigate } from "react-router-dom";

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
    console.log("GarageFormContainer: garage created with ID", garageId);
    
    if (typeof onComplete === 'function') {
      onComplete(garageId);
    } else {
      console.warn("onComplete is not a function, using default navigation");
      // Default navigation based on user type
      navigate(userType === "owner" ? "/garage-management" : "/dashboard");
    }
  };

  return <GarageForm userId={userId} onComplete={handleComplete} />;
};
