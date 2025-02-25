
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppointmentWithRelations, AppointmentStatus, BayType } from "@/types/appointment";

interface AppointmentFormProps {
  initialData: AppointmentWithRelations | null;
  selectedDate: Date | null;
  onClose: () => void;
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
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .order("first_name");

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
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
  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["vehicles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, year, license_plate")
        .eq("client_id", clientId);

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!clientId,
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

const TimeSelector = ({ startTime, endTime, onStartTimeChange, onEndTimeChange }: { startTime: string, endTime: string, onStartTimeChange: (value: string) => void, onEndTimeChange: (value: string) => void }) => {
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
}: AppointmentFormProps) => {
  const defaultStartTime = roundToNearestHour(selectedDate || new Date());
  const [duration, setDuration] = useState("60"); // Default 1 hour duration

  const [formData, setFormData] = useState<AppointmentFormData>({
    client_id: initialData?.client_id || null,
    vehicle_id: initialData?.vehicle_id || null,
    start_time: initialData?.start_time ? formatDateTimeForInput(initialData.start_time) : 
                formatDateTimeForInput(defaultStartTime),
    end_time: initialData?.end_time ? formatDateTimeForInput(initialData.end_time) : 
             formatDateTimeForInput(new Date(defaultStartTime.getTime() + 60 * 60 * 1000)),
    service_type: initialData?.service_type || '',
    notes: initialData?.notes || null,
    status: initialData?.status || 'scheduled',
    bay: initialData?.bay || null,
  });

  // Update end_time when start_time or duration changes
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

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: (error) => {
      console.error("Error creating appointment:", error);
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
      onClose();
    },
    onError: (error) => {
      console.error("Error updating appointment:", error);
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
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Appointment' : 'Create Appointment'}
        </Button>
      </div>
    </form>
  );
};
