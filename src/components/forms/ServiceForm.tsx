
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface ServiceFormProps {
  clientId: string;
  vehicles?: Vehicle[];
  onClose: () => void;
  initialData?: {
    id: string;
    service_type: string;
    description: string;
    cost: number;
    status: string;
    service_date: string;
  };
}

export const ServiceForm = ({ clientId, vehicles, onClose, initialData }: ServiceFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    service_type: initialData?.service_type || "",
    description: initialData?.description || "",
    cost: initialData?.cost || 0,
    status: initialData?.status || "pending",
    service_date: initialData?.service_date || new Date().toISOString().split('T')[0],
    vehicle_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from("service_history")
          .update(formData)
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Service record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("service_history")
          .insert([{
            ...formData,
            client_id: clientId,
            vehicle_id: formData.vehicle_id || null,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Service record added successfully",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["service_history", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["client-appointments", clientId] });
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="service_type">Service Type</Label>
        <Input
          id="service_type"
          required
          value={formData.service_type}
          onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
        />
      </div>

      {vehicles && vehicles.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="vehicle_id">Vehicle</Label>
          <select
            id="vehicle_id"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.vehicle_id}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.license_plate && `(${vehicle.license_plate})`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service_date">Service Date</Label>
          <Input
            id="service_date"
            type="date"
            required
            value={formData.service_date}
            onChange={(e) => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.cost}
            onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          className="w-full border border-input rounded-md h-10 px-3"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Service" : "Add Service"}
        </Button>
      </div>
    </form>
  );
};
