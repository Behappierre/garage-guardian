import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import type { AppointmentWithRelations, AppointmentStatus, BayType } from "@/types/appointment";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/useAuth";

interface AppointmentFormProps {
  initialData: AppointmentWithRelations | null;
  selectedDate: Date | null;
  onClose: () => void;
  preselectedClientId?: string;
}

interface AppointmentFormData {
  client_id: string | null;
  vehicle_id: string | null;
  start_time: string;
  end_time: string;
  service_type: string;
  notes: string | null;
  status: AppointmentStatus;
  bay: BayType;
  garage_id: string | null;
}

const roundToNearestHour = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMinutes(0);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  rounded.setHours(rounded.getHours() + 1);
  return rounded;
};

const formatDateTimeForInput = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
};

const durations = Array.from({ length: 16 }, (_, i) => (i + 1) * 30); // 30 min to 8 hours in 30 min intervals

const ClientSelector = ({ value, onChange }: { value: string | null, onChange: (value: string) => void }) => {
  const { garageId } = useAuth();
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering clients");
        return [];
      }
      
      console.log("Fetching clients for garage ID:", garageId);
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("garage_id", garageId)
        .order("first_name");

      if (error) {
        throw new Error(error.message);
      }
      console.log(`Retrieved ${data?.length || 0} clients for garage ${garageId}`);
      return data;
    },
    enabled: !!garageId,
  });

  if (isLoading) return <div>Loading clients...</div>;
  if (error) return <div>Error loading clients: {error.message}</div>;

  return (
    <div className="space-y-2">
      <Label htmlFor="client">Client</Label>
      <Select onValueChange={onChange} value={value || ""}>
        <SelectTrigger id="client">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clients?.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const VehicleSelector = ({ clientId, value, onChange }: { clientId: string, value: string | null, onChange: (value: string) => void }) => {
  const { garageId } = useAuth();
  
  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["vehicles", clientId, garageId],
    queryFn: async () => {
      if (!clientId || !garageId) return [];
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, year, license_plate")
        .eq("client_id", clientId)
        .eq("garage_id", garageId);

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!clientId && !!garageId,
  });

  if (isLoading) return <div>Loading vehicles...</div>;
  if (error) return <div>Error loading vehicles: {error.message}</div>;

  return (
    <div className="space-y-2">
      <Label htmlFor="vehicle">Vehicle</Label>
      <Select onValueChange={onChange} value={value || ""}>
        <SelectTrigger id="vehicle">
          <SelectValue placeholder="Select a vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles?.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const TimeSelector = ({ startTime, endTime, onStartTimeChange, onEndTimeChange }: 
  { startTime: string, endTime: string, onStartTimeChange: (value: string) => void, onEndTimeChange: (value: string) => void }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start_time">Start Time</Label>
        <Input
          type="datetime-local"
          id="start_time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_time">End Time</Label>
        <Input
          type="datetime-local"
          id="end_time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
        />
      </div>
    </div>
  );
};

const ServiceTypeInput = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="service_type">Service Type</Label>
      <Input
        type="text"
        id="service_type"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

const NotesInput = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Notes</Label>
      <Input
        type="text"
        id="notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export const AppointmentForm = ({
  initialData,
  selectedDate,
  onClose,
  preselectedClientId
}: AppointmentFormProps) => {
  const { garageId } = useAuth();
  const [isLoadingTimeSlot, setIsLoadingTimeSlot] = useState(false);
  const defaultStartTime = roundToNearestHour(selectedDate || new Date());
  const [duration, setDuration] = useState("60"); // Default 1 hour duration

  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: initialData?.client_id || preselectedClientId || null,
    vehicle_id: initialData?.vehicle_id || null,
    start_time: initialData?.start_time ? formatDateTimeForInput(initialData.start_time) : 
                formatDateTimeForInput(defaultStartTime),
    end_time: initialData?.end_time ? formatDateTimeForInput(initialData.end_time) : 
             formatDateTimeForInput(new Date(defaultStartTime.getTime() + 60 * 60 * 1000)),
    service_type: initialData?.service_type || '',
    notes: initialData?.notes || null,
    status: initialData?.status || 'scheduled',
    bay: initialData?.bay || null,
    garage_id: initialData?.garage_id || garageId,
  });

  useEffect(() => {
    if (garageId && formData.garage_id !== garageId) {
      setFormData(prev => ({ ...prev, garage_id: garageId }));
    }
  }, [garageId]);

  const { data: existingAppointments } = useQuery({
    queryKey: ["all-appointments", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering appointments");
        return [];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get appointments for the next 7 days
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);
      
      const { data, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("garage_id", garageId)
        .gte("start_time", today.toISOString())
        .lte("start_time", endDate.toISOString())
        .neq("status", "cancelled");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !initialData && !!garageId,
  });

  const { data: linkedJobTickets } = useQuery({
    queryKey: ["linked-job-tickets", initialData?.id, garageId],
    enabled: !!initialData?.id && !!garageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_job_tickets")
        .select(`
          job_ticket:job_tickets(
            id, 
            ticket_number, 
            description, 
            status
          )
        `)
        .eq("appointment_id", initialData?.id);
      
      if (error) throw error;
      return data?.map(item => item.job_ticket) || [];
    },
  });

  const findNextAvailableTimeSlot = () => {
    if (!existingAppointments || existingAppointments.length === 0) {
      return defaultStartTime;
    }

    setIsLoadingTimeSlot(true);
    
    try {
      const now = new Date();
      const startCheckingFrom = new Date(now);
      startCheckingFrom.setMinutes(0);
      startCheckingFrom.setSeconds(0);
      startCheckingFrom.setMilliseconds(0);
      
      const businessHourStart = 8; // 8 AM
      const businessHourEnd = 18; // 6 PM
      
      const bookedSlots = existingAppointments.map(appointment => ({
        start: new Date(appointment.start_time),
        end: new Date(appointment.end_time)
      }));
      
      const durationMs = parseInt(duration) * 60 * 1000;
      
      let currentSlot = new Date(startCheckingFrom);
      let daysToCheck = 14;
      
      while (daysToCheck > 0) {
        const currentHour = currentSlot.getHours();
        
        if (currentHour >= businessHourStart && currentHour < businessHourEnd) {
          const slotEnd = new Date(currentSlot.getTime() + durationMs);
          
          const isBooked = bookedSlots.some(bookedSlot => {
            return (
              (currentSlot >= bookedSlot.start && currentSlot < bookedSlot.end) ||
              (slotEnd > bookedSlot.start && slotEnd <= bookedSlot.end) ||
              (currentSlot <= bookedSlot.start && slotEnd >= bookedSlot.end)
            );
          });
          
          if (!isBooked) {
            return currentSlot;
          }
        }
        
        currentSlot.setTime(currentSlot.getTime() + 30 * 60 * 1000);
        
        if (currentSlot.getHours() === 0) {
          daysToCheck--;
        }
      }
      
      return defaultStartTime;
    } finally {
      setIsLoadingTimeSlot(false);
    }
  };

  useEffect(() => {
    if (!initialData && existingAppointments) {
      const nextAvailableSlot = findNextAvailableTimeSlot();
      setFormData(prev => ({
        ...prev,
        start_time: formatDateTimeForInput(nextAvailableSlot),
        end_time: formatDateTimeForInput(new Date(nextAvailableSlot.getTime() + parseInt(duration) * 60 * 1000))
      }));
    }
  }, [existingAppointments, initialData]);

  useEffect(() => {
    const startDate = new Date(formData.start_time);
    const durationInMs = parseInt(duration) * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationInMs);
    setFormData(prev => ({
      ...prev,
      end_time: formatDateTimeForInput(endDate)
    }));
  }, [formData.start_time, duration]);

  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([data])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data.client_id && appointment) {
        const { data: jobTicket, error: ticketError } = await supabase
          .rpc('create_job_ticket', {
            p_description: `Service appointment: ${data.service_type}`,
            p_status: 'draft',
            p_priority: 'normal',
            p_assigned_technician_id: null,
            p_client_id: data.client_id,
            p_vehicle_id: data.vehicle_id,
            p_garage_id: data.garage_id
          });

        if (ticketError) {
          console.error("Error creating job ticket:", ticketError);
        } else if (jobTicket) {
          const { error: relationError } = await supabase
            .from('appointment_job_tickets')
            .insert([{
              appointment_id: appointment.id,
              job_ticket_id: jobTicket
            }]);

          if (relationError) {
            console.error("Error linking appointment to job ticket:", relationError);
          }
        }
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['job_tickets'] });
      toast.success('Appointment created successfully with linked job ticket');
      onClose();
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
      onClose();
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
      onClose();
    },
    onError: (error) => {
      console.error("Error cancelling appointment:", error);
      toast.error('Failed to cancel appointment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateAppointmentMutation.mutateAsync({ ...formData, id: initialData.id });
      } else {
        await createAppointmentMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error during appointment submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!initialData?.id) return;
    
    if (confirm('Are you sure you want to cancel this appointment?')) {
      await cancelAppointmentMutation.mutateAsync(initialData.id);
    }
  };

  const navigateToTicket = (ticketId: string) => {
    window.location.href = `/dashboard/job-tickets?id=${ticketId}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ClientSelector
        value={formData.client_id}
        onChange={(value) => setFormData({ ...formData, client_id: value })}
      />

      {formData.client_id && (
        <VehicleSelector
          clientId={formData.client_id}
          value={formData.vehicle_id}
          onChange={(value) => setFormData({ ...formData, vehicle_id: value })}
        />
      )}

      {linkedJobTickets && linkedJobTickets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Linked Job Tickets</Label>
          <div className="flex flex-wrap gap-2">
            {linkedJobTickets.map((ticket: any) => (
              <div 
                key={ticket.id}
                onClick={() => navigateToTicket(ticket.id)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
              >
                <span className="text-sm">{ticket.ticket_number}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'}`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
                <ExternalLink className="h-3 w-3 text-gray-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            type="datetime-local"
            id="start_time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Select
            value={duration}
            onValueChange={(value) => setDuration(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durations.map((mins) => (
                <SelectItem key={mins} value={mins.toString()}>
                  {mins >= 60 ? `${mins / 60} hour${mins > 60 ? 's' : ''}` : `${mins} minutes`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ServiceTypeInput
        value={formData.service_type}
        onChange={(value) => setFormData({ ...formData, service_type: value })}
      />

      <div className="space-y-2">
        <Label>Bay Assignment</Label>
        <Select
          value={formData.bay || ""}
          onValueChange={(value) => setFormData({ ...formData, bay: value as BayType })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a bay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bay1">Bay 1</SelectItem>
            <SelectItem value="bay2">Bay 2</SelectItem>
            <SelectItem value="mot">MOT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <NotesInput
        value={formData.notes || ''}
        onChange={(value) => setFormData({ ...formData, notes: value })}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {initialData && (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleCancel}
            disabled={isSubmitting || initialData.status === 'cancelled'}
          >
            Cancel Booking
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Appointment' : 'Create Appointment'}
        </Button>
      </div>
    </form>
  );
};
