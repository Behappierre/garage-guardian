
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, AlertCircle, Settings, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GaragesList } from "./GaragesList";
import { NewGarageForm } from "./NewGarageForm";
import { useOwnerGarages } from "@/hooks/useOwnerGarages";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const GarageManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { garages, isLoading, error, refreshGarages } = useOwnerGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isMultiGarageAdmin, setIsMultiGarageAdmin] = useState(false);
  const [loginSource, setLoginSource] = useState<"owner" | "staff" | null>(null);
  const [selectedGarageId, setSelectedGarageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Check if user came from staff login or owner login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const source = params.get('source');
    
    if (source === 'staff') {
      console.log("User came from staff login, setting multi-garage mode");
      setLoginSource('staff');
      setIsMultiGarageAdmin(true);
    } else {
      setLoginSource('owner');
    }
  }, [garages, location]);
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const handleGarageCreated = (garageId: string) => {
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  const handleSelectGarage = async (garageId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Unable to detect user for garage association");
        return;
      }
      
      console.log(`User ${userData.user.id} selecting garage ${garageId}`);
      
      // Update user_roles with garage_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ garage_id: garageId })
        .eq('user_id', userData.user.id);
        
      if (roleError) {
        console.error("Error updating user role:", roleError);
        toast.error("Failed to update your garage association");
        return;
      }
      
      // Ensure user is in garage_members table as owner
      const { error: membershipError } = await supabase
        .from('garage_members')
        .upsert({
          user_id: userData.user.id,
          garage_id: garageId,
          role: 'owner'
        }, {
          onConflict: 'user_id,garage_id'
        });
        
      if (membershipError) {
        console.error("Error creating garage membership:", membershipError);
      }
      
      // Update profile with garage_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userData.user.id);
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
      
      toast.success("Successfully associated with garage");
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error selecting garage:", error);
      toast.error("Failed to select garage");
    }
  };

  const handleExportData = async (garageId: string) => {
    try {
      toast.info("Preparing garage data export...");
      
      // Get garage details
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .eq('id', garageId)
        .single();
        
      if (garageError) {
        throw new Error("Failed to fetch garage data");
      }

      // Get clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('garage_id', garageId);
        
      if (clientsError) {
        throw new Error("Failed to fetch client data");
      }

      // Get vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('garage_id', garageId);
        
      if (vehiclesError) {
        throw new Error("Failed to fetch vehicle data");
      }

      // Get job tickets
      const { data: jobTickets, error: ticketsError } = await supabase
        .from('job_tickets')
        .select('*')
        .eq('garage_id', garageId);
        
      if (ticketsError) {
        throw new Error("Failed to fetch job ticket data");
      }

      // Get appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('garage_id', garageId);
        
      if (appointmentsError) {
        throw new Error("Failed to fetch appointment data");
      }

      // Compile all data
      const exportData = {
        exportDate: new Date().toISOString(),
        garage: garageData,
        clients,
        vehicles,
        jobTickets,
        appointments
      };

      // Convert to JSON and trigger download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileName = `${garageData.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      toast.success("Garage data exported successfully");
    } catch (error) {
      console.error("Error exporting garage data:", error);
      toast.error("Failed to export garage data");
    }
  };

  const handleDeleteGarage = async () => {
    if (!selectedGarageId) return;
    
    try {
      toast.info("Deleting garage...");
      
      // Delete the garage
      const { error: deleteError } = await supabase
        .from('garages')
        .delete()
        .eq('id', selectedGarageId);
        
      if (deleteError) {
        throw new Error("Failed to delete garage");
      }
      
      // Close dialog and refresh list
      setShowDeleteDialog(false);
      refreshGarages();
      toast.success("Garage deleted successfully");
    } catch (error) {
      console.error("Error deleting garage:", error);
      toast.error("Failed to delete garage");
    }
  };

  if (showCreateForm) {
    return (
      <NewGarageForm
        onBack={() => setShowCreateForm(false)} 
        onComplete={handleGarageCreated}
      />
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Garages</h1>
          <p className="text-gray-500">
            {isMultiGarageAdmin 
              ? "Select which garage you want to manage" 
              : garages.length > 0 
                ? "Select a garage to manage or create a new one" 
                : "Get started by creating your first garage"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isMultiGarageAdmin && (
        <Alert className="mb-6" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Multiple Garages Detected</AlertTitle>
          <AlertDescription>
            You have access to multiple garages. Please select which garage you want to manage.
          </AlertDescription>
        </Alert>
      )}

      {garages.length === 0 && !isLoading ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h2 className="text-xl font-semibold mb-4">No Garages Found</h2>
          <p className="text-gray-500 mb-6">Create your first garage to get started</p>
          <Button onClick={() => setShowCreateForm(true)}>Create Your First Garage</Button>
        </div>
      ) : (
        <GaragesList
          garages={garages}
          isLoading={isLoading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
          onSettingsClick={(garageId) => setSelectedGarageId(garageId)}
          onExportData={handleExportData}
          onDeleteClick={(garageId) => {
            setSelectedGarageId(garageId);
            setShowDeleteDialog(true);
          }}
        />
      )}

      {/* Delete Garage Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Garage</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the garage
              and all associated data including clients, vehicles, job tickets, and appointments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGarage} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
