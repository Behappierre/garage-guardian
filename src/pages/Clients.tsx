import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { ClientList } from "@/components/clients/ClientList";
import { ClientDetails } from "@/components/clients/ClientDetails";
import { ClientForm } from "@/components/forms/ClientForm";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader, PageActionButton } from "@/components/ui/page-header";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/AuthProvider";

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

// Update Vehicle interface to match Supabase schema
interface Vehicle {
  id: string;
  client_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  vin: string | null;
  created_at: string;
  updated_at: string;
}

const Clients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { garageId } = useAuth();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", garageId],
    queryFn: async () => {
      console.log("Fetching clients for garage ID:", garageId);
      
      if (!garageId) {
        console.error("No garage ID available for filtering clients");
        return [];
      }
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone, address, notes, created_at")
        .eq("garage_id", garageId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error.message);
        throw error;
      }
      
      console.log(`Retrieved ${data?.length || 0} clients for garage ${garageId}`);
      return data as Client[];
    },
    staleTime: 10000,
    enabled: !!garageId
  });

  const selectedClient = clients?.find(c => c.id === selectedClientId) || null;

  const { data: clientVehicles } = useQuery({
    queryKey: ["vehicles", selectedClientId, garageId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", selectedClientId)
        .eq("garage_id", garageId);

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!selectedClientId && !!garageId,
  });

  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientDialog(true);
  };

  const handleEditClient = () => {
    if (selectedClient) {
      setEditingClient(selectedClient);
      setShowClientDialog(true);
    }
  };

  const handleCloseClientDialog = () => {
    setShowClientDialog(false);
    setEditingClient(null);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const handleCloseVehicleDialog = () => {
    setShowVehicleDialog(false);
    if (selectedClientId) {
      queryClient.invalidateQueries({ queryKey: ["vehicles", selectedClientId] });
    }
  };

  const handleCloseServiceDialog = () => {
    setShowServiceDialog(false);
  };

  useEffect(() => {
    if (!selectedClientId && clients && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="Clients"
        description="Manage your client records and appointments"
        className={isDarkMode ? "bg-black" : ""}
      >
        <PageActionButton
          icon={<UserPlus className="h-4 w-4" />}
          onClick={handleAddClient}
        >
          Add New Client
        </PageActionButton>
      </PageHeader>

      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ClientList
            clients={clients}
            isLoading={isLoading}
            selectedClient={selectedClient}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectClient={(client) => setSelectedClientId(client.id)}
          />

          {selectedClient ? (
            <ClientDetails
              client={selectedClient}
              vehicles={clientVehicles}
              onEditClient={handleEditClient}
              onAddVehicle={() => setShowVehicleDialog(true)}
              onAddService={() => setShowServiceDialog(true)}
            />
          ) : (
            <div className={`col-span-2 rounded-lg shadow-sm p-6 text-center ${
              isDarkMode 
                ? "bg-gray-900 text-gray-400" 
                : "bg-white text-gray-500"
            }`}>
              {clients && clients.length > 0 
                ? "Select a client to view details" 
                : "No clients available. Add a new client to get started."}
            </div>
          )}
        </div>
      </div>

      <Dialog 
        open={showClientDialog} 
        onOpenChange={(open) => {
          if (!open) handleCloseClientDialog();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <ClientForm
            initialData={editingClient || undefined}
            onClose={handleCloseClientDialog}
          />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showVehicleDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseVehicleDialog();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {selectedClient && (
            <VehicleForm
              clientId={selectedClient.id}
              onClose={handleCloseVehicleDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showServiceDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseServiceDialog();
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedClient && (
            <ServiceForm
              clientId={selectedClient.id}
              onClose={handleCloseServiceDialog}
              vehicles={clientVehicles}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
