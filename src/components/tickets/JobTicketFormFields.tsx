
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobTicketFormData, TicketPriority, TicketStatus } from "@/types/job-ticket";

interface JobTicketFormFieldsProps {
  formData: JobTicketFormData;
  setFormData: (data: JobTicketFormData) => void;
  clients?: { id: string; first_name: string; last_name: string; }[];
  clientVehicles?: { id: string; year: number; make: string; model: string; }[];
  clientAppointments?: { id: string; start_time: string; service_type: string; }[];
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
}

export const JobTicketFormFields = ({
  formData,
  setFormData,
  clients,
  clientVehicles,
  clientAppointments,
  selectedAppointmentId,
  setSelectedAppointmentId,
}: JobTicketFormFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          className="w-full border border-input rounded-md h-10 px-3"
          value={formData.client_id || ""}
          onChange={(e) => {
            setFormData({ 
              ...formData, 
              client_id: e.target.value || null,
              vehicle_id: null
            });
            setSelectedAppointmentId(null);
          }}
          required
        >
          <option value="">Select a client</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>
      </div>

      {formData.client_id && clientVehicles?.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle (Optional)</Label>
          <select
            id="vehicle"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.vehicle_id || ""}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value || null })}
          >
            <option value="">Select a vehicle</option>
            {clientVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </option>
            ))}
          </select>
        </div>
      )}

      {formData.client_id && clientAppointments?.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="appointment">Link to Appointment (Optional)</Label>
          <select
            id="appointment"
            className="w-full border border-input rounded-md h-10 px-3"
            value={selectedAppointmentId || ""}
            onChange={(e) => setSelectedAppointmentId(e.target.value || null)}
          >
            <option value="">Select an appointment</option>
            {clientAppointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {new Date(appointment.start_time).toLocaleString()} - {appointment.service_type}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full border border-input rounded-md h-10 px-3"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TicketStatus })}
          >
            <option value="received">Received</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="pending_parts">Pending Parts</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </>
  );
};
