
import type { Database } from "@/integrations/supabase/types";

export type DBAppointment = Database["public"]["Tables"]["appointments"]["Row"];
export type DBClient = Database["public"]["Tables"]["clients"]["Row"];
export type DBJobTicket = Database["public"]["Tables"]["job_tickets"]["Row"] & {
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
};

export type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed";
export type BayType = "bay1" | "bay2" | "mot" | null;
export type AppointmentSortField = "start_time" | "client_name";
export type SortOrder = "asc" | "desc";
export type DateRangeFilter = "all" | "today" | "tomorrow" | "thisWeek" | "thisMonth" | "custom";

export interface AppointmentWithRelations extends Omit<DBAppointment, 'bay'> {
  client: DBClient;
  job_tickets?: DBJobTicket[];
  vehicle?: Database["public"]["Tables"]["vehicles"]["Row"] | null;
  bay?: BayType;
}
