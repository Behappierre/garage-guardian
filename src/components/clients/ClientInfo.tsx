
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
}

interface ClientInfoProps {
  client: Client;
  onEdit: () => void;
}

export const ClientInfo = ({
  client,
  onEdit,
}: ClientInfoProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {client.first_name} {client.last_name}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{client.email || "No email"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-medium">{client.phone || "No phone"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Address</p>
          <p className="font-medium">{client.address || "No address"}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Notes</p>
          <p className="font-medium">{client.notes || "No notes added"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit Details
        </Button>
      </div>
    </div>
  );
};
