
import { Button } from "@/components/ui/button";

interface EmptyGarageStateProps {
  onCreateGarage: () => void;
}

export function EmptyGarageState({ onCreateGarage }: EmptyGarageStateProps) {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <h2 className="text-xl font-semibold mb-4">No Garages Found</h2>
      <p className="text-gray-500 mb-6">Create your first garage to get started</p>
      <Button onClick={onCreateGarage}>Create Your First Garage</Button>
    </div>
  );
}
