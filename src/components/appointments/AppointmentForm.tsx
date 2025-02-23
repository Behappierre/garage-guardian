
import { Button } from "@/components/ui/button";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ClientSelector } from "./ClientSelector";
import { TicketSelector } from "./TicketSelector";
import { TimeSelector } from "./TimeSelector";
import { ServiceTypeInput } from "./ServiceTypeInput";
import { NotesInput } from "./NotesInput";
import { VehicleSelector } from "./VehicleSelector";
import { useAppointmentForm } from "./hooks/useAppointmentForm";
import { useState } from "react";

interface AppointmentFormProps {
  initialData?: AppointmentWithRelations | null;
  selectedDate?: Date | null;
  onClose: () => void;
}

export const AppointmentForm = ({ initialData, selectedDate, onClose }: AppointmentFormProps) => {
  const {
    formData,
    setFormData,
    isSubmitting,
    isCancelling,
    selectedTickets,
    setSelectedTickets,
    clients,
    vehicles,
    jobTickets,
    selectedVehicleId,
    setSelectedVehicleId,
    handleSubmit,
    handleCancel
  } = useAppointmentForm({ initialData, selectedDate, onClose });

  const [isEditingVehicle, setIsEditingVehicle] = useState(false);

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId) || 
    initialData?.vehicle ||
    jobTickets?.find(ticket => ticket.id === selectedTickets[0])?.vehicle;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientSelector
        clients={clients}
        selectedClientId={formData.client_id}
        onClientChange={(clientId) => {
          setFormData(prev => ({ ...prev, client_id: clientId }));
          setSelectedVehicleId(null);
          setIsEditingVehicle(false);
        }}
      />

      {selectedVehicle && !isEditingVehicle && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Vehicle</label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditingVehicle(true)}
            >
              Change Vehicle
            </Button>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              {selectedVehicle.license_plate && (
                <span className="ml-1">({selectedVehicle.license_plate})</span>
              )}
            </p>
          </div>
        </div>
      )}

      {(!selectedVehicle || isEditingVehicle) && (
        <VehicleSelector
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleChange={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setIsEditingVehicle(false);
          }}
        />
      )}

      <TicketSelector
        clientId={formData.client_id}
        tickets={jobTickets}
        selectedTickets={selectedTickets}
        appointmentId={initialData?.id}
        onTicketSelectionChange={setSelectedTickets}
      />

      <ServiceTypeInput
        value={formData.service_type}
        onChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
      />

      <TimeSelector
        startTime={formData.start_time}
        endTime={formData.end_time}
        onStartTimeChange={(time) => setFormData(prev => ({ ...prev, start_time: time }))}
        onEndTimeChange={(time) => setFormData(prev => ({ ...prev, end_time: time }))}
      />

      <NotesInput
        value={formData.notes}
        onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
      />

      <div className="flex justify-end gap-2">
        {initialData && initialData.status !== 'cancelled' && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel Appointment"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {initialData?.status !== 'cancelled' && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update Appointment" : "Create Appointment"}
          </Button>
        )}
      </div>
    </form>
  );
};
