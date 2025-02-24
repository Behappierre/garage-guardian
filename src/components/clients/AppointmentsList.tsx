
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import type { AppointmentWithRelations } from "@/types/appointment";
import { AppointmentItem } from "./AppointmentItem";

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
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showAddButton && (
          <Button variant="outline" size="sm" onClick={() => setShowAppointmentForm(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <AppointmentItem key={appointment.id} appointment={appointment} />
          ))
        ) : (
          <p className="text-gray-500">No {title.toLowerCase()}</p>
        )}
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
