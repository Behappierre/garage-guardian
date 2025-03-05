
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface GarageAlertsProps {
  error: string | null;
  isMultiGarageAdmin: boolean;
  debugInfo?: string | null;
}

export function GarageAlerts({ error, isMultiGarageAdmin, debugInfo }: GarageAlertsProps) {
  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isMultiGarageAdmin && (
        <Alert className="mb-6" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Multiple Garages Detected</AlertTitle>
          <AlertDescription>
            You have access to multiple garages. Please select which garage you want to manage.
          </AlertDescription>
        </Alert>
      )}

      {debugInfo && (
        <Alert className="mb-6" variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <pre className="text-xs overflow-auto max-h-40">{debugInfo}</pre>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
