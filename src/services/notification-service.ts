
import { supabase } from "@/integrations/supabase/client";

export const sendEmailNotification = async (
  jobTicketId: string,
  notificationType: string,
  recipientEmail: string,
  clientName: string,
  ticketNumber: string,
  status: string
) => {
  const { error } = await supabase.functions.invoke('send-job-ticket-notification', {
    body: {
      jobTicketId,
      notificationType,
      recipientEmail,
      clientName,
      ticketNumber,
      status
    },
  });

  if (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
