
import { Car, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface ServiceRecord {
  id: string;
  service_date: string;
  service_type: string;
  description: string;
  cost: number;
  status: string;
}

interface ClientDetailsProps {
  client: Client;
  vehicles: Vehicle[] | undefined;
  serviceHistory: ServiceRecord[] | undefined;
  onEditClient: () => void;
  onAddVehicle: () => void;
  onAddService: () => void;
}

export const ClientDetails = ({
  client,
  vehicles,
  serviceHistory,
  onEditClient,
  onAddVehicle,
  onAddService,
}: ClientDetailsProps) => {
  return (
    <div className="col-span-2 space-y-6">
      {/* Client Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {client.first_name} {client.last_name}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{client.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{client.phone}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="font-medium">{client.notes || "No notes added"}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditClient}>
            Edit Details
          </Button>
        </div>
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
          <Button variant="outline" size="sm" onClick={onAddVehicle}>
            <Car className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {vehicles?.map((vehicle) => (
            <div key={vehicle.id} className="border rounded-lg p-4">
              <h4 className="font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h4>
              <p className="text-sm text-gray-500">
                License: {vehicle.license_plate}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Service History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service History</h3>
          <Button variant="outline" size="sm" onClick={onAddService}>
            <Calendar className="mr-2 h-4 w-4" />
            New Service
          </Button>
        </div>
        <div className="space-y-4">
          {serviceHistory?.map((service) => (
            <div key={service.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{service.service_type}</h4>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${service.cost}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(service.service_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    service.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : service.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {service.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
