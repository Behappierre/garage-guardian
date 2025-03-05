
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Garage } from "@/types/garage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditGarageDetailsDialogProps {
  garage: Garage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGarageUpdated: () => void;
}

interface GarageUpdateForm {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export function EditGarageDetailsDialog({
  garage,
  open,
  onOpenChange,
  onGarageUpdated
}: EditGarageDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GarageUpdateForm>({
    defaultValues: {
      name: garage?.name || "",
      address: garage?.address || "",
      email: garage?.email || "",
      phone: garage?.phone || "",
    }
  });
  
  // Reset form when garage changes
  useState(() => {
    if (garage) {
      reset({
        name: garage.name,
        address: garage.address || "",
        email: garage.email || "",
        phone: garage.phone || "",
      });
    }
  });

  const onSubmit = async (data: GarageUpdateForm) => {
    if (!garage) return;

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('garages')
        .update({
          name: data.name,
          address: data.address,
          email: data.email,
          phone: data.phone
        })
        .eq('id', garage.id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success("Garage details updated successfully");
      onGarageUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating garage:", error);
      toast.error("Failed to update garage details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Garage Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Garage Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Garage name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="123 Main St, Anytown, ST 12345"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="contact@mygarage.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Business Phone</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="(123) 456-7890"
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
