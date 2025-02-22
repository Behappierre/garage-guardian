
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  UserPlus,
  Filter,
  Car,
  Phone,
  Mail,
  Calendar
} from "lucide-react";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
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

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    }
  });

  const { data: clientVehicles } = useQuery({
    queryKey: ["vehicles", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", selectedClient.id);

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!selectedClient
  });

  const { data: serviceHistory } = useQuery({
    queryKey: ["service_history", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("service_history")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("service_date", { ascending: false });

      if (error) throw error;
      return data as ServiceRecord[];
    },
    enabled: !!selectedClient
  });

  const filteredClients = clients?.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
            <p className="text-gray-500">Manage your client records and service history</p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Client List and Details */}
        <div className="grid grid-cols-3 gap-6">
          {/* Client List */}
          <div className="col-span-1 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Client List</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : (
                filteredClients?.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedClient?.id === client.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <h3 className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <Mail className="mr-2 h-4 w-4" />
                      {client.email}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <Phone className="mr-2 h-4 w-4" />
                      {client.phone}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Client Details */}
          {selectedClient ? (
            <>
              {/* Client Info */}
              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedClient.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedClient.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium">{selectedClient.notes || "No notes added"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">Edit Details</Button>
                    <Button variant="outline" size="sm">Add Note</Button>
                  </div>
                </div>

                {/* Vehicles */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
                    <Button variant="outline" size="sm">
                      <Car className="mr-2 h-4 w-4" />
                      Add Vehicle
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {clientVehicles?.map((vehicle) => (
                      <div key={vehicle.id} className="border rounded-lg p-4">
                        <h4 className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                        <p className="text-sm text-gray-500">License: {vehicle.license_plate}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service History */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Service History</h3>
                    <Button variant="outline" size="sm">
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
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            service.status === 'completed' ? 'bg-green-100 text-green-800' :
                            service.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {service.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              Select a client to view details
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Clients;
