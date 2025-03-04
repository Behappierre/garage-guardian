
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";

interface GarageAlertsProps {
  debugInfo: string | null;
  error: string | null;
  garagesEmpty: boolean;
}

export const GarageAlerts = ({ debugInfo, error, garagesEmpty }: GarageAlertsProps) => {
  return (
    <>
      {debugInfo && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Debug information: {debugInfo}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant={error.includes("Using default garage") ? "default" : "destructive"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {garagesEmpty && !error && (
        <Alert variant="warning" className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            No garages found. You can create a new garage using the button below.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
