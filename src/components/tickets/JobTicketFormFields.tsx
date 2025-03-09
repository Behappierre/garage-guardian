
import { JobTicketFormData, TicketType } from "@/types/job-ticket";
import {
  ClientSelector,
  VehicleSelector,
  AppointmentSelector,
  TechnicianSelector,
  StatusPrioritySelectors,
  DescriptionField,
  TicketTypeSelector,
} from "./form-fields";

interface JobTicketFormFieldsProps {
  formData: JobTicketFormData;
  setFormData: (data: JobTicketFormData) => void;
  clients?: { id: string; first_name: string; last_name: string }[];
  clientVehicles?: { id: string; make: string; model: string; license_plate?: string }[];
  clientAppointments?: { id: string; start_time: string; service_type: string }[];
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
  technicians?: { id: string; first_name: string; last_name: string }[];
  isLoadingAppointments?: boolean;
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
  isLoadingAppointments,
}: JobTicketFormFieldsProps) => {
  return (
    <div className="grid gap-4">
      <ClientSelector
        clientId={formData.client_id}
        clients={clients}
        onClientChange={(clientId) => {
          setFormData({
            ...formData,
            client_id: clientId,
            vehicle_id: null,
          });
          setSelectedAppointmentId(null);
        }}
      />

      {formData.client_id && (
        <>
          <VehicleSelector
            vehicleId={formData.vehicle_id}
            vehicles={clientVehicles}
            onVehicleChange={(vehicleId) =>
              setFormData({
                ...formData,
                vehicle_id: vehicleId,
              })
            }
          />

          <AppointmentSelector
            appointmentId={selectedAppointmentId}
            appointments={clientAppointments}
            onAppointmentChange={setSelectedAppointmentId}
            isLoading={isLoadingAppointments}
          />
        </>
      )}

      <TechnicianSelector
        technicianId={formData.assigned_technician_id}
        technicians={technicians}
        onTechnicianChange={(technicianId) =>
          setFormData({
            ...formData,
            assigned_technician_id: technicianId,
          })
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusPrioritySelectors
          status={formData.status}
          priority={formData.priority}
          onStatusChange={(status) =>
            setFormData({
              ...formData,
              status: status,
            })
          }
          onPriorityChange={(priority) =>
            setFormData({
              ...formData,
              priority: priority,
            })
          }
        />
        <TicketTypeSelector
          ticketType={formData.ticket_type}
          onTicketTypeChange={(ticketType) =>
            setFormData({
              ...formData,
              ticket_type: ticketType,
            })
          }
        />
      </div>

      <DescriptionField
        description={formData.description}
        onDescriptionChange={(description) =>
          setFormData({
            ...formData,
            description: description,
          })
        }
      />
    </div>
  );
};
