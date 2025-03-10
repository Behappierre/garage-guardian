import { Car, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { VehicleForm } from "@/components/forms/VehicleForm";

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

interface VehiclesListProps {
  vehicles: Vehicle[] | undefined;
  onAddVehicle: () => void;
}

export const VehiclesList = ({ vehicles, onAddVehicle }: VehiclesListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setVehicleToEdit(null);
    setShowEditDialog(false);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    
    setIsDeleting(true);
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id")
        .eq("vehicle_id", vehicleToDelete.id)
        .limit(1);
        
      if (appointmentsError) throw appointmentsError;
      
      if (appointmentsData && appointmentsData.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete vehicle",
          description: "This vehicle is associated with one or more appointments. Remove the appointments first.",
        });
        setIsDeleting(false);
        setVehicleToDelete(null);
        return;
      }
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("job_tickets")
        .select("id")
        .eq("vehicle_id", vehicleToDelete.id)
        .limit(1);
        
      if (ticketsError) throw ticketsError;
      
      if (ticketsData && ticketsData.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete vehicle",
          description: "This vehicle is associated with one or more job tickets. Remove the job tickets first.",
        });
        setIsDeleting(false);
        setVehicleToDelete(null);
        return;
      }

      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleToDelete.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleToDelete.client_id] });
      
      toast({
        title: "Vehicle deleted",
        description: `${vehicleToDelete.year} ${vehicleToDelete.make} ${vehicleToDelete.model} has been removed.`,
      });
    } catch (error: any) {
      console.error("Error deleting vehicle:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete vehicle",
      });
    } finally {
      setIsDeleting(false);
      setVehicleToDelete(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
        <Button variant="outline" size="sm" onClick={onAddVehicle} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>
      
      <div className="p-6">
        {vehicles && vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-500 mr-2" />
                    <h4 className="font-medium text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h4>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      onClick={() => handleEditClick(vehicle)}
                      title="Edit vehicle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      onClick={() => handleDeleteClick(vehicle)}
                      title="Delete vehicle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {vehicle.license_plate && (
                    <div className="mt-1">
                      <span className="bg-[#FEF7CD] text-gray-700 px-2 py-0.5 rounded border border-gray-200 font-medium text-xs inline-block">
                        {vehicle.license_plate}
                      </span>
                    </div>
                  )}
                  {vehicle.vin && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">VIN:</span>
                      <span className="text-sm font-mono">{vehicle.vin}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Car className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 mb-1">No vehicles added</h3>
            <p className="text-sm text-gray-400 mb-4">Add a vehicle to track maintenance and services</p>
            <Button variant="outline" size="sm" onClick={onAddVehicle}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Vehicle
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={vehicleToDelete !== null} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle? {vehicleToDelete && (
                <span className="font-medium">
                  {vehicleToDelete.year} {vehicleToDelete.make} {vehicleToDelete.model}
                </span>
              )}
              <br/><br/>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {vehicleToEdit && (
            <VehicleForm 
              clientId={vehicleToEdit.client_id} 
              onClose={handleCloseEditDialog} 
              initialData={vehicleToEdit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
