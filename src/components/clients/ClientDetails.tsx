import { Car, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { AppointmentWithRelations } from "@/types/appointment";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

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
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const now = new Date();
  const upcomingAppointments = appointments?.filter(
    app => new Date(app.start_time) >= now
  ) || [];
  const previousAppointments = appointments?.filter(
    app => new Date(app.start_time) < now
  ) || [];

  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  const handleDialogClose = () => {
    setShowAppointmentDialog(false);
    setTimeout(() => {
      setSelectedAppointment(null);
    }, 100);
  };

  const renderAppointment = (appointment: AppointmentWithRelations) => (
    <div 
      key={appointment.id} 
      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleAppointmentClick(appointment)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{appointment.service_type}</h4>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Start: {format(new Date(appointment.start_time), "MMM d, yyyy h:mm a")}</p>
            <p>End: {format(new Date(appointment.end_time), "MMM d, yyyy h:mm a")}</p>
            {appointment.job_tickets?.[0]?.vehicle && (
              <p className="text-sm text-gray-600">
                Vehicle: {appointment.job_tickets[0].vehicle.year} {appointment.job_tickets[0].vehicle.make} {appointment.job_tickets[0].vehicle.model}
                {appointment.job_tickets[0].vehicle.license_plate && (
                  <span className="ml-1">({appointment.job_tickets[0].vehicle.license_plate})</span>
                )}
              </p>
            )}
            {appointment.notes && <p className="text-gray-600">{appointment.notes}</p>}
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
            appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'}`}
        >
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="col-span-2 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {client.first_name} {client.last_name}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{client.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{client.phone}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="font-medium">{client.notes || "No notes added"}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditClient}>
            Edit Details
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
          <Button variant="outline" size="sm" onClick={onAddVehicle}>
            <Car className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {vehicles?.map((vehicle) => (
            <div key={vehicle.id} className="border rounded-lg p-4">
              <h4 className="font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h4>
              <p className="text-sm text-gray-500">
                License: {vehicle.license_plate}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
          <Button variant="outline" size="sm" onClick={onAddService}>
            <Calendar className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
        <div className="space-y-4">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(renderAppointment)
          ) : (
            <p className="text-gray-500">No upcoming appointments</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Previous Appointments</h3>
        </div>
        <div className="space-y-4">
          {previousAppointments.length > 0 ? (
            previousAppointments.map(renderAppointment)
          ) : (
            <p className="text-gray-500">No previous appointments</p>
          )}
        </div>
      </div>

      <Dialog 
        open={showAppointmentDialog} 
        onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedAppointment && (
            <AppointmentForm
              initialData={selectedAppointment}
              onClose={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
