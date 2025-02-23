
import { Button } from "@/components/ui/button";

interface ClientInfoProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  onEditClient: () => void;
}

export const ClientInfo = ({
  firstName,
  lastName,
  email,
  phone,
  notes,
  onEditClient,
}: ClientInfoProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {firstName} {lastName}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{email || "No email"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-medium">{phone || "No phone"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Notes</p>
          <p className="font-medium">{notes || "No notes added"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={onEditClient}>
          Edit Details
        </Button>
      </div>
    </div>
  );
};
