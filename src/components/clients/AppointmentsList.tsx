
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppointmentWithRelations } from "@/types/appointment";
import { AppointmentItem } from "./AppointmentItem";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";

interface AppointmentsListProps {
  title: string;
  appointments: AppointmentWithRelations[];
  showAddButton?: boolean;
  onAddService?: () => void;
}

export const AppointmentsList = ({ 
  title,
  appointments,
  showAddButton = false,
  onAddService
}: AppointmentsListProps) => {
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showAddButton && onAddService && (
            <Button variant="outline" size="sm" onClick={onAddService}>
              <Calendar className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <AppointmentItem 
                key={appointment.id} 
                appointment={appointment} 
                onClick={() => setSelectedAppointment(appointment)}
              />
            ))
          ) : (
            <p className="text-gray-500">No {title.toLowerCase()}</p>
          )}
        </div>
      </div>

      <Dialog 
        open={!!selectedAppointment} 
        onOpenChange={(open) => {
          if (!open) setSelectedAppointment(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          {selectedAppointment && (
            <AppointmentForm
              initialData={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
