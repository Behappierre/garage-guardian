
import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import type { AppointmentWithRelations } from "@/types/appointment";
import { AppointmentItem } from "./AppointmentItem";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleAppointmentClick = (appointment: AppointmentWithRelations) => {
    // Extract the date from the appointment's start_time
    const appointmentDate = new Date(appointment.start_time);
    const dateStr = appointmentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Navigate to appointments page with the date in URL params and specify day view
    navigate(`/dashboard/appointments?date=${dateStr}&view=timeGridDay`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showAddButton && onAddService && (
          <Button variant="outline" size="sm" onClick={onAddService} className="gap-1">
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        )}
      </div>
      
      <div className="p-6">
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div 
                key={appointment.id}
                onClick={() => handleAppointmentClick(appointment)}
                className="cursor-pointer"
              >
                <AppointmentItem appointment={appointment} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 mb-1">No {title.toLowerCase()}</h3>
            {showAddButton && onAddService && (
              <>
                <p className="text-sm text-gray-400 mb-4">Schedule a new appointment</p>
                <Button variant="outline" size="sm" onClick={onAddService}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
