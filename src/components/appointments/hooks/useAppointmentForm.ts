
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseAppointmentFormProps, AppointmentFormData } from "./types";
import { useDateFormatting } from "./useDateFormatting";
import { useAppointmentQueries } from "./useAppointmentQueries";
import { useAppointmentMutations } from "./useAppointmentMutations";
import { useAuth } from "@/components/auth/AuthProvider";

export const useAppointmentForm = ({ initialData, selectedDate, onClose }: UseAppointmentFormProps) => {
  const queryClient = useQueryClient();
  const { garageId } = useAuth();
  const defaultDate = selectedDate || new Date();
  const { formatDateTimeForInput, formatDefaultDate } = useDateFormatting();

  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: initialData?.client_id || "",
    service_type: initialData?.service_type || "",
    start_time: initialData?.start_time ? formatDateTimeForInput(initialData.start_time) : formatDefaultDate(defaultDate),
    end_time: initialData?.end_time ? formatDateTimeForInput(initialData.end_time) : formatDefaultDate(defaultDate),
    notes: initialData?.notes || "",
    status: initialData?.status || "scheduled",
    vehicle_id: initialData?.vehicle_id || null,
    garage_id: garageId || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(initialData?.vehicle_id || null);

  const { clients, vehicles } = useAppointmentQueries(formData.client_id);

  const {
    createAppointmentMutation,
    updateAppointmentMutation,
    cancelAppointmentMutation
  } = useAppointmentMutations(onClose);

  // Update form data when vehicle changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, vehicle_id: selectedVehicleId }));
  }, [selectedVehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await updateAppointmentMutation.mutateAsync({ 
          ...formData, 
          id: initialData.id 
        });
      } else {
        await createAppointmentMutation.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error("Error submitting appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!initialData?.id) return;
    setIsCancelling(true);
    try {
      await cancelAppointmentMutation.mutateAsync(initialData.id);
      onClose();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    formData,
    setFormData,
    isSubmitting,
    isCancelling,
    clients,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    handleSubmit,
    handleCancel
  };
};
