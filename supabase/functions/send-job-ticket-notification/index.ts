
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EmailNotificationRequest {
  jobTicketId: string;
  notificationType: string;
  recipientEmail: string;
  clientName: string;
  ticketNumber: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTicketId, notificationType, recipientEmail, clientName, ticketNumber, status }: EmailNotificationRequest = await req.json();

    // Prepare email content based on notification type
    let subject = '';
    let content = '';

    switch (notificationType) {
      case 'status_update':
        subject = `Job Ticket ${ticketNumber} Status Update`;
        content = `
          <h1>Job Ticket Status Update</h1>
          <p>Hello ${clientName},</p>
          <p>Your job ticket (${ticketNumber}) has been updated to: ${status}</p>
          <p>We'll keep you informed of any further updates.</p>
        `;
        break;
      case 'completion':
        subject = `Job Ticket ${ticketNumber} Completed`;
        content = `
          <h1>Job Ticket Completed</h1>
          <p>Hello ${clientName},</p>
          <p>We're pleased to inform you that your job ticket (${ticketNumber}) has been completed.</p>
          <p>Thank you for choosing our services.</p>
        `;
        break;
      default:
        throw new Error('Invalid notification type');
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Auto Service <notifications@your-domain.com>',
      to: [recipientEmail],
      subject: subject,
      html: content,
    });

    // Log the notification in the database
    const { error: dbError } = await supabase
      .from('email_notifications')
      .insert({
        job_ticket_id: jobTicketId,
        status: 'sent',
        recipient_email: recipientEmail,
        notification_type: notificationType,
      });

    if (dbError) throw dbError;

    console.log('Email notification sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-job-ticket-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
