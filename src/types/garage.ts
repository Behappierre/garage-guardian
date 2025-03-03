
import type { Database } from "@/integrations/supabase/types";

export type GarageRole = "owner" | "admin" | "manager" | "technician" | "front_desk";

export type Garage = {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  settings?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export type GarageMember = {
  id: string;
  garage_id: string;
  user_id: string;
  role: GarageRole;
  created_at: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

export type GarageFormData = {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
};

export type CreateGarageFormData = GarageFormData & {
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  owner_password: string;
};
