
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { JobTicketFormData } from "@/types/job-ticket";
import { useGarage } from "@/contexts/GarageContext";

export const useTicketMutations = (onClose: () => void) => {
  const queryClient = useQueryClient();
  const { currentGarage } = useGarage();

  // Create or update job ticket
  const submitTicketMutation = useMutation({
    mutationFn: async ({
      formData,
      ticketId,
      appointmentId
    }: {
      formData: JobTicketFormData;
      ticketId?: string;
      appointmentId?: string | null;
    }) => {
      // Always ensure garage_id is set
      const dataWithGarage = {
        ...formData,
        garage_id: formData.garage_id || currentGarage?.id || null
      };
      
      if (ticketId) {
        // Update existing ticket
        const { error } = await supabase
          .from("job_tickets")
          .update(dataWithGarage)
          .eq("id", ticketId);

        if (error) throw error;
        return ticketId;
      } else {
        // For new tickets, use our custom function to handle job ticket creation
        const { data, error } = await supabase
          .functions.invoke("create-job-ticket", {
            body: {
              description: dataWithGarage.description,
              status: dataWithGarage.status,
              priority: dataWithGarage.priority,
              assigned_technician_id: dataWithGarage.assigned_technician_id,
              client_id: dataWithGarage.client_id,
              vehicle_id: dataWithGarage.vehicle_id,
              garage_id: dataWithGarage.garage_id
            }
          });

        if (error) throw error;
        // The function returns the job ticket ID
        return data?.jobTicketId as string;
      }
    },
    onSuccess: async (jobTicketId, { appointmentId }) => {
      // If there's an appointment to link
      if (appointmentId) {
        try {
          // Check if link already exists
          const { data: existingLink } = await supabase
            .from("appointment_job_tickets")
            .select("id")
            .eq("appointment_id", appointmentId)
            .eq("job_ticket_id", jobTicketId)
            .maybeSingle();

          if (!existingLink) {
            // Create link between appointment and job ticket
            await supabase
              .from("appointment_job_tickets")
              .insert({
                appointment_id: appointmentId,
                job_ticket_id: jobTicketId
              });
          }
        } catch (error) {
          console.error("Error linking appointment:", error);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["job_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      
      toast.success("Job ticket saved successfully");
      onClose();
    },
    onError: (error: any) => {
      console.error("Error saving job ticket:", error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Enhance ticket description using AI
  const enhanceDescriptionMutation = useMutation({
    mutationFn: async ({
      description,
      vehicleInfo
    }: {
      description: string;
      vehicleInfo?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke("enhance-job-description", {
        body: {
          description,
          vehicleInfo: vehicleInfo ? {
            make: vehicleInfo.make,
            model: vehicleInfo.model,
            year: vehicleInfo.year,
          } : null,
        },
      });

      if (error) throw error;
      return data?.enhancedDescription || description;
    },
    onError: (error) => {
      console.error("Error enhancing description:", error);
      toast.error("Failed to enhance description. Please try again.");
    },
  });

  const submitTicket = async (
    formData: JobTicketFormData,
    ticketId?: string,
    appointmentId?: string | null
  ) => {
    return submitTicketMutation.mutateAsync({
      formData,
      ticketId,
      appointmentId
    });
  };

  const enhanceDescription = async (description: string, vehicleInfo?: any) => {
    return enhanceDescriptionMutation.mutateAsync({
      description,
      vehicleInfo
    });
  };

  return {
    submitTicket,
    enhanceDescription,
    isSubmitting: submitTicketMutation.isPending,
    isEnhancing: enhanceDescriptionMutation.isPending,
  };
};
