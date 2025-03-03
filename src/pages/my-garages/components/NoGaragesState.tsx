
import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoGaragesStateProps {
  onReturnHome: () => void;
}

export const NoGaragesState = ({ onReturnHome }: NoGaragesStateProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <Building className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Garages Found</h3>
        <p className="text-gray-600 mb-6">You don't have access to any garages or you're not an administrator.</p>
        <Button onClick={onReturnHome}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};
