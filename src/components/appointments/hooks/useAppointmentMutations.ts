
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/useAuth";
import type { AppointmentFormData } from "./types";

export const useAppointmentMutations = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  const { garageId } = useAuth();

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!garageId) {
        throw new Error("No garage ID available");
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([{ ...data, garage_id: garageId }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast.success('Appointment created successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating appointment:", error);
      toast.error('Failed to create appointment');
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData & { id: string }) => {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast.success('Appointment updated successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error("Error updating appointment:", error);
      toast.error('Failed to update appointment');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast.success('Appointment cancelled successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error("Error cancelling appointment:", error);
      toast.error('Failed to cancel appointment');
    },
  });

  return {
    createAppointmentMutation,
    updateAppointmentMutation,
    cancelAppointmentMutation,
  };
};
