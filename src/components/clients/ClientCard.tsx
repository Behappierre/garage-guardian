
import { Mail, Phone } from "lucide-react";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
}

interface ClientCardProps {
  client: Client;
  isSelected: boolean;
  onClick: () => void;
}

export const ClientCard = ({ client, isSelected, onClick }: ClientCardProps) => {
  return (
    <div
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-primary/5 border-l-4 border-primary -ml-[4px]" : ""
      }`}
      onClick={onClick}
    >
      <h3 className="font-medium text-gray-900">
        {client.first_name} {client.last_name}
      </h3>
      <div className="mt-1 flex items-center text-sm text-gray-500">
        <Mail className="mr-2 h-4 w-4" />
        {client.email || "No email"}
      </div>
      <div className="mt-1 flex items-center text-sm text-gray-500">
        <Phone className="mr-2 h-4 w-4" />
        {client.phone || "No phone"}
      </div>
    </div>
  );
};
