
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface DeleteGarageDialogProps {
  garageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGarageDeleted: () => void;
}

export function DeleteGarageDialog({
  garageId,
  open,
  onOpenChange,
  onGarageDeleted
}: DeleteGarageDialogProps) {
  const handleDeleteGarage = async () => {
    if (!garageId) return;
    
    try {
      toast.info("Deleting garage...");
      
      const { error: deleteError } = await supabase
        .from('garages')
        .delete()
        .eq('id', garageId);
        
      if (deleteError) {
        throw new Error("Failed to delete garage");
      }
      
      onOpenChange(false);
      onGarageDeleted();
      toast.success("Garage deleted successfully");
    } catch (error) {
      console.error("Error deleting garage:", error);
      toast.error("Failed to delete garage");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
  );
}
