
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, FileText, Edit } from "lucide-react";

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
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {client.first_name} {client.last_name}
        </h2>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="text-sm text-gray-900">{client.email || "No email"}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Phone</h3>
              <p className="text-sm text-gray-900">{client.phone || "No phone"}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Address</h3>
              <p className="text-sm text-gray-900 whitespace-pre-line">{client.address || "No address"}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="text-sm text-gray-900 whitespace-pre-line">{client.notes || "No notes added"}</p>
            </div>
          </div>
          
          <div className="flex items-start mt-4">
            <div className="ml-8">
              <h3 className="text-sm font-medium text-gray-500">Client since</h3>
              <p className="text-sm text-gray-900">{formatDate(client.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
