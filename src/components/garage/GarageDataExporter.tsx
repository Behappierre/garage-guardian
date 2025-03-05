
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export async function exportGarageData(garageId: string) {
  try {
    toast.info("Preparing garage data export...");
    
    const { data: garageData, error: garageError } = await supabase
      .from('garages')
      .select('*')
      .eq('id', garageId)
      .single();
      
    if (garageError) {
      throw new Error("Failed to fetch garage data");
    }

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('garage_id', garageId);
      
    if (clientsError) {
      throw new Error("Failed to fetch client data");
    }

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('garage_id', garageId);
      
    if (vehiclesError) {
      throw new Error("Failed to fetch vehicle data");
    }

    const { data: jobTickets, error: ticketsError } = await supabase
      .from('job_tickets')
      .select('*')
      .eq('garage_id', garageId);
      
    if (ticketsError) {
      throw new Error("Failed to fetch job ticket data");
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('garage_id', garageId);
      
    if (appointmentsError) {
      throw new Error("Failed to fetch appointment data");
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      garage: garageData,
      clients,
      vehicles,
      jobTickets,
      appointments
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `${garageData.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    toast.success("Garage data exported successfully");
  } catch (error) {
    console.error("Error exporting garage data:", error);
    toast.error("Failed to export garage data");
  }
}
