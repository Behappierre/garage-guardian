import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { JobTicketFormData } from "@/types/job-ticket";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobTicketFormFieldsProps {
  formData: JobTicketFormData;
  setFormData: (data: JobTicketFormData) => void;
  clients?: { id: string; first_name: string; last_name: string }[];
  clientVehicles?: { id: string; make: string; model: string; license_plate?: string }[];
  clientAppointments?: { id: string; start_time: string; service_type: string }[];
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
  technicians?: { id: string; first_name: string; last_name: string }[];
  onEnhanceDescription?: () => void;
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
  onEnhanceDescription,
}: JobTicketFormFieldsProps) => {
  return (
    <div className="grid gap-4">
      <div>
        <Label>Client</Label>
        <Select
          value={formData.client_id || ""}
          onValueChange={(value) => {
            setFormData({
              ...formData,
              client_id: value,
              vehicle_id: null,
            });
            setSelectedAppointmentId(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
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

      {formData.client_id && (
        <>
          <div>
            <Label>Vehicle</Label>
            <Select
              value={formData.vehicle_id || ""}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  vehicle_id: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {clientVehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model}
                    {vehicle.license_plate ? ` (${vehicle.license_plate})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Link to Appointment</Label>
            <Select
              value={selectedAppointmentId || ""}
              onValueChange={setSelectedAppointmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select appointment" />
              </SelectTrigger>
              <SelectContent>
                {clientAppointments?.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {new Date(appointment.start_time).toLocaleString()} - {appointment.service_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div>
        <Label>Assigned Technician</Label>
        <Select
          value={formData.assigned_technician_id || ""}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              assigned_technician_id: value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
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
        <Select
          value={formData.status}
          onValueChange={(value: any) =>
            setFormData({
              ...formData,
              status: value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value: any) =>
            setFormData({
              ...formData,
              priority: value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          {onEnhanceDescription && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onEnhanceDescription}
            >
              <Wand2 className="h-4 w-4" />
              Enhance
            </Button>
          )}
        </div>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
          rows={4}
        />
      </div>
    </div>
  );
};
