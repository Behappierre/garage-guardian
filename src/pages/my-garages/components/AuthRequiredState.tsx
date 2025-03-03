
import { Building } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthRequiredStateProps {
  onSignIn: () => void;
}

export const AuthRequiredState = ({ onSignIn }: AuthRequiredStateProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <Building className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600 mb-6">Please sign in to access your garages.</p>
        <Button onClick={onSignIn}>
          Sign In
        </Button>
      </div>
    </div>
  );
};
