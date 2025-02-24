
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

interface AppointmentReminderRequest {
  appointment_id: string;
  client_name: string;
  client_email: string;
  start_time: string;
  service_type: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      appointment_id,
      client_name,
      client_email,
      start_time,
      service_type 
    }: AppointmentReminderRequest = await req.json();

    // Format the date for the email
    const appointmentDate = new Date(start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Send the reminder email
    const emailResponse = await resend.emails.send({
      from: 'GarageWizz <notifications@your-domain.com>',
      to: [client_email],
      subject: 'Reminder: Your Appointment Tomorrow',
      html: `
        <h1>Appointment Reminder</h1>
        <p>Hello ${client_name},</p>
        <p>This is a friendly reminder about your appointment tomorrow:</p>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${formattedTime}</li>
          <li><strong>Service:</strong> ${service_type}</li>
        </ul>
        <p>If you need to reschedule, please contact us as soon as possible.</p>
        <p>Thank you for choosing GarageWizz!</p>
      `,
    });

    // Log the notification in the database
    const { error: dbError } = await supabase
      .from('email_notifications')
      .insert({
        appointment_id,
        status: 'sent',
        recipient_email: client_email,
        notification_type: 'appointment_reminder',
      });

    if (dbError) throw dbError;

    console.log('Appointment reminder sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-appointment-reminder:', error);
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
