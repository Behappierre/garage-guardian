
import { Json } from "@/integrations/supabase/types";

export interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
  email?: string;
}

export interface GarageHookReturn {
  garages: Garage[];
  loading: boolean;
  refreshGarages: () => Promise<any>;
}

export type GarageMemberRole = 'owner' | 'member' | 'manager';
