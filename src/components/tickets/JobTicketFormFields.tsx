
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicketFormData } from "@/types/job-ticket";
import type { Database } from "@/integrations/supabase/types";

interface JobTicketFormFieldsProps {
  formData: JobTicketFormData;
  setFormData: (data: JobTicketFormData) => void;
  clients?: { id: string; first_name: string; last_name: string; }[] | null;
  clientVehicles?: Database["public"]["Tables"]["vehicles"]["Row"][] | null;
  clientAppointments?: any[] | null;
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
  technicians?: { id: string; first_name: string | null; last_name: string | null; }[] | null;
}

export const JobTicketFormFields = ({
  formData,
  setFormData,
  clients,
  clientVehicles,
  clientAppointments,
  selectedAppointmentId,
  setSelectedAppointmentId,
  technicians,
}: JobTicketFormFieldsProps) => {
  const handleEnhanceDescription = async () => {
    if (!formData.description) {
      toast.error("Please enter a description first");
      return;
    }

    try {
      const selectedVehicle = clientVehicles?.find(v => v.id === formData.vehicle_id);
      const vehicleInfo = selectedVehicle 
        ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
        : undefined;

      const { data, error } = await supabase.functions.invoke('enhance-job-description', {
        body: { description: formData.description, vehicle: vehicleInfo }
      });

      if (error) throw error;

      if (data.enhancedDescription) {
        setFormData({ ...formData, description: data.enhancedDescription });
        toast.success("Description enhanced successfully");
      }
    } catch (error: any) {
      toast.error("Failed to enhance description");
      console.error('Error enhancing description:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="client">Client</Label>
        <Select
          value={formData.client_id || "none"}
          onValueChange={(value) => {
            setFormData({
              ...formData,
              client_id: value === "none" ? null : value,
              vehicle_id: null,
            });
            setSelectedAppointmentId(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.first_name} {client.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.client_id && clientVehicles && clientVehicles.length > 0 && (
        <div>
          <Label htmlFor="vehicle">Vehicle</Label>
          <Select
            value={formData.vehicle_id || "none"}
            onValueChange={(value) =>
              setFormData({ ...formData, vehicle_id: value === "none" ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {clientVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.client_id && clientAppointments && clientAppointments.length > 0 && (
        <div>
          <Label htmlFor="appointment">Link to Appointment (Optional)</Label>
          <Select
            value={selectedAppointmentId || "none"}
            onValueChange={(value) => setSelectedAppointmentId(value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an appointment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {clientAppointments.map((appointment) => (
                <SelectItem key={appointment.id} value={appointment.id}>
                  {new Date(appointment.start_time).toLocaleDateString()}{" "}
                  {new Date(appointment.start_time).toLocaleTimeString()} -{" "}
                  {appointment.service_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="description">Description</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEnhanceDescription}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Enhance
          </Button>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="h-32"
        />
      </div>

      <div>
        <Label htmlFor="technician">Assign Technician (Optional)</Label>
        <Select
          value={formData.assigned_technician_id || "none"}
          onValueChange={(value) =>
            setFormData({ ...formData, assigned_technician_id: value === "none" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {technicians?.map((technician) => (
              <SelectItem key={technician.id} value={technician.id}>
                {technician.first_name} {technician.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Status</Label>
        <RadioGroup
          value={formData.status}
          onValueChange={(value: any) =>
            setFormData({ ...formData, status: value })
          }
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="received" id="received" />
            <Label htmlFor="received">Received</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in_progress" id="in_progress" />
            <Label htmlFor="in_progress">In Progress</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="completed" id="completed" />
            <Label htmlFor="completed">Completed</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pending_parts" id="pending_parts" />
            <Label htmlFor="pending_parts">Pending Parts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cancelled" id="cancelled" />
            <Label htmlFor="cancelled">Cancelled</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Priority</Label>
        <RadioGroup
          value={formData.priority}
          onValueChange={(value: any) =>
            setFormData({ ...formData, priority: value })
          }
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="low" id="low" />
            <Label htmlFor="low">Low</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="normal" />
            <Label htmlFor="normal">Normal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="high" id="high" />
            <Label htmlFor="high">High</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="urgent" id="urgent" />
            <Label htmlFor="urgent">Urgent</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
