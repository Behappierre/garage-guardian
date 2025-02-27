
import { useMemo } from "react";
import { AppointmentsList } from "./AppointmentsList";
import { VehiclesList } from "./VehiclesList";
import { ClientInfo } from "./ClientInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import type { AppointmentWithRelations } from "@/types/appointment";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  client_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  color: string;
  notes: string;
}

interface ClientDetailsProps {
  client: Client;
  vehicles?: Vehicle[];
  onEditClient: () => void;
  onAddVehicle: () => void;
  onAddService: () => void;
}

export const ClientDetails = ({
  client,
  vehicles = [],
  onEditClient,
  onAddVehicle,
  onAddService,
}: ClientDetailsProps) => {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["client-appointments", client.id],
    queryFn: async () => {
      const today = new Date();
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          job_tickets:job_tickets(*)
        `)
        .eq("client_id", client.id)
        .gte("start_time", today.toISOString())
        .order("start_time", { ascending: true });

      if (upcomingError) throw upcomingError;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data: previousData, error: previousError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          job_tickets:job_tickets(*)
        `)
        .eq("client_id", client.id)
        .lt("start_time", today.toISOString())
        .gte("start_time", thirtyDaysAgo.toISOString())
        .order("start_time", { ascending: false });

      if (previousError) throw previousError;

      // Process the job_tickets to ensure it's always an array
      const processAppointments = (appointments: any[]) => {
        return appointments.map(appointment => ({
          ...appointment,
          job_tickets: Array.isArray(appointment.job_tickets) 
            ? appointment.job_tickets 
            : appointment.job_tickets ? [appointment.job_tickets] : []
        })) as AppointmentWithRelations[];
      };

      return {
        upcoming: processAppointments(upcomingData || []),
        previous: processAppointments(previousData || [])
      };
    },
  });

  const { data: jobTickets } = useQuery({
    queryKey: ["client-job-tickets", client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const upcomingAppointments = useMemo(() => appointments?.upcoming || [], [appointments]);
  const previousAppointments = useMemo(() => appointments?.previous || [], [appointments]);

  return (
    <>
      <div className="col-span-2 space-y-6">
        <ClientInfo client={client} onEdit={onEditClient} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VehiclesList 
            vehicles={vehicles} 
            onAddVehicle={onAddVehicle}
          />

          <AppointmentsList
            title="Upcoming Appointments"
            appointments={upcomingAppointments}
            showAddButton={true}
            onAddService={() => setShowAppointmentForm(true)}
          />

          {previousAppointments.length > 0 && (
            <AppointmentsList
              title="Previous Appointments"
              appointments={previousAppointments}
            />
          )}
        </div>
      </div>

      <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            initialData={null}
            selectedDate={null}
            onClose={() => setShowAppointmentForm(false)}
            preselectedClientId={client.id}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
