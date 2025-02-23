
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseAppointmentFormProps, AppointmentFormData } from "./types";
import { useDateFormatting } from "./useDateFormatting";
import { useAppointmentQueries } from "./useAppointmentQueries";
import { useAppointmentMutations } from "./useAppointmentMutations";

export const useAppointmentForm = ({ initialData, selectedDate, onClose }: UseAppointmentFormProps) => {
  const queryClient = useQueryClient();
  const defaultDate = selectedDate || new Date();
  const { formatDateTimeForInput, formatDefaultDate } = useDateFormatting();

  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: initialData?.client_id || "",
    service_type: initialData?.service_type || "",
    start_time: initialData?.start_time ? formatDateTimeForInput(initialData.start_time) : formatDefaultDate(defaultDate),
    end_time: initialData?.end_time ? formatDateTimeForInput(initialData.end_time) : formatDefaultDate(defaultDate),
    notes: initialData?.notes || "",
    status: initialData?.status || "scheduled",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { 
    clients,
    vehicles,
    jobTickets,
    appointmentTickets,
    appointmentTicketsLoaded
  } = useAppointmentQueries(formData.client_id, initialData?.id);

  const { handleSubmit: submitAppointment, handleCancel: cancelAppointment } = useAppointmentMutations();

  // Set initial selected tickets and vehicle from appointment
  useEffect(() => {
    if (appointmentTicketsLoaded && appointmentTickets) {
      setSelectedTickets(appointmentTickets.map(t => t.job_ticket_id));
      
      const ticketWithVehicle = appointmentTickets.find(t => t.job_tickets?.vehicle);
      if (ticketWithVehicle?.job_tickets?.vehicle?.id) {
        setSelectedVehicleId(ticketWithVehicle.job_tickets.vehicle.id);
      }
    }
  }, [appointmentTickets, appointmentTicketsLoaded]);

  // Update vehicle when tickets change
  useEffect(() => {
    if (jobTickets && selectedTickets.length > 0 && !selectedVehicleId) {
      const firstSelectedTicket = jobTickets.find(ticket => ticket.id === selectedTickets[0]);
      if (firstSelectedTicket?.vehicle) {
        setSelectedVehicleId(firstSelectedTicket.vehicle.id);
      }
    }
  }, [selectedTickets, jobTickets, selectedVehicleId]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitAppointment(formData, selectedTickets, initialData?.id, queryClient, onClose);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = async () => {
    if (!initialData?.id) return;
    setIsCancelling(true);
    try {
      await cancelAppointment(initialData.id, queryClient, onClose);
    } finally {
      setIsCancelling(false);
    }
  };

  return {
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
    handleSubmit: handleFormSubmit,
    handleCancel: handleFormCancel
  };
};
