
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const AdminOperations = () => {
  const { garageId } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const exportGarageData = async () => {
    if (!garageId) {
      toast.error("No garage selected");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Preparing garage data export...");
      
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .eq('id', garageId)
        .single();
        
      if (garageError) {
        throw new Error("Failed to fetch garage data");
      }

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('garage_id', garageId);
        
      if (clientsError) {
        throw new Error("Failed to fetch client data");
      }

      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('garage_id', garageId);
        
      if (vehiclesError) {
        throw new Error("Failed to fetch vehicle data");
      }

      const { data: jobTickets, error: ticketsError } = await supabase
        .from('job_tickets')
        .select('*')
        .eq('garage_id', garageId);
        
      if (ticketsError) {
        throw new Error("Failed to fetch job ticket data");
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('garage_id', garageId);
        
      if (appointmentsError) {
        throw new Error("Failed to fetch appointment data");
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        garage: garageData,
        clients,
        vehicles,
        jobTickets,
        appointments
      };

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
    } finally {
      setIsExporting(false);
    }
  };

  const deleteGarage = async () => {
    if (!garageId) {
      toast.error("No garage selected");
      return;
    }
    
    try {
      setIsDeleting(true);
      toast.info("Deleting garage...");
      
      const { error: deleteError } = await supabase
        .from('garages')
        .delete()
        .eq('id', garageId);
        
      if (deleteError) {
        throw new Error("Failed to delete garage");
      }
      
      // Close the dialog and show success message
      setIsDeleteDialogOpen(false);
      toast.success("Garage deleted successfully");
      
      // Redirect to dashboard or reload the page after a short delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (error) {
      console.error("Error deleting garage:", error);
      toast.error("Failed to delete garage");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Garage Operations</CardTitle>
          <CardDescription>Manage your garage data and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Export Garage Data</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download all garage data including clients, vehicles, job tickets, and appointments.
            </p>
            <Button 
              onClick={exportGarageData} 
              disabled={isExporting || !garageId}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this garage and all associated data. This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteDialogOpen(true)} 
              disabled={isDeleting || !garageId}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Garage
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
            <AlertDialogAction onClick={deleteGarage} className="bg-destructive text-destructive-foreground">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
