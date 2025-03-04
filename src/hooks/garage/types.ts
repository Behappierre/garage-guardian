
export interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface GarageHookReturn {
  garages: Garage[];
  loading: boolean;
  error: string | null;
  refreshGarages: () => Promise<any>;
}
