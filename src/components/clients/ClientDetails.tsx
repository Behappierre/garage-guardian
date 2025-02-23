
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations } from "@/types/appointment";
import { ClientInfo } from "./ClientInfo";
import { VehiclesList } from "./VehiclesList";
import { AppointmentsList } from "./AppointmentsList";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface ClientDetailsProps {
  client: Client;
  vehicles: Vehicle[] | undefined;
  onEditClient: () => void;
  onAddVehicle: () => void;
  onAddService: () => void;
}

export const ClientDetails = ({
  client,
  vehicles,
  onEditClient,
  onAddVehicle,
  onAddService,
}: ClientDetailsProps) => {
  const { data: appointments } = useQuery({
    queryKey: ["client-appointments", client.id],
    queryFn: async () => {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          job_tickets:appointment_job_tickets(
            job_ticket:job_tickets(
              *,
              vehicle:vehicles(*)
            )
          )
        `)
        .eq("client_id", client.id)
        .order("start_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments = appointmentsData.map(appointment => ({
        ...appointment,
        job_tickets: appointment.job_tickets.map((t: any) => t.job_ticket).filter(Boolean)
      })) as AppointmentWithRelations[];

      return formattedAppointments;
    }
  });

  const now = new Date();
  const upcomingAppointments = appointments?.filter(
    app => new Date(app.start_time) >= now
  ) || [];
  const previousAppointments = appointments?.filter(
    app => new Date(app.start_time) < now
  ) || [];

  return (
    <div className="col-span-2 space-y-6">
      <ClientInfo
        firstName={client.first_name}
        lastName={client.last_name}
        email={client.email}
        phone={client.phone}
        notes={client.notes}
        onEditClient={onEditClient}
      />

      <VehiclesList 
        vehicles={vehicles}
        onAddVehicle={onAddVehicle}
      />

      <AppointmentsList
        title="Upcoming Appointments"
        appointments={upcomingAppointments}
        showAddButton={true}
        onAddService={onAddService}
      />

      <AppointmentsList
        title="Previous Appointments"
        appointments={previousAppointments}
      />
    </div>
  );
};
