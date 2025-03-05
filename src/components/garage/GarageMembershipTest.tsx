
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createGarageMember } from "@/utils/auth/garageAccess";
import { Check, AlertCircle } from "lucide-react";

export const GarageMembershipTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  const testMembership = async () => {
    setLoading(true);
    try {
      // Use the specified IDs from the test code
      const userId = 'e1dfe7bb-522f-4fa7-bdfa-2495d1961971';
      const garageId = '64960ccf-e353-4b4f-b951-ff687f35c78c';
      
      const success = await createGarageMember(userId, garageId);
      
      setResult({
        success,
        message: success 
          ? `Successfully created membership between User ${userId} and Garage ${garageId}`
          : `Failed to create membership relationship`
      });
    } catch (error) {
      console.error("Test error:", error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-medium mb-4">Test Garage Membership Creation</h3>
      
      <Button 
        onClick={testMembership} 
        disabled={loading}
        className="mb-4"
      >
        {loading ? "Creating..." : "Create Test Membership"}
      </Button>
      
      {result && (
        <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
          {result.success ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
