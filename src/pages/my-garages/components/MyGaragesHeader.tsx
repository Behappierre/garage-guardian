
import { LogOut, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MyGaragesHeaderProps {
  onSignOut: () => Promise<void>;
}

export const MyGaragesHeader = ({ onSignOut }: MyGaragesHeaderProps) => {
  const handleSignOut = async () => {
    await onSignOut();
    toast.success("Logged out successfully");
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
      <div className="flex items-center">
        <Building className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-xl font-bold text-gray-900">GarageWizz</h1>
      </div>
      <Button variant="ghost" onClick={handleSignOut} className="text-gray-600">
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
};
