
export interface Garage {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  owner_id: string;
  relationship_type?: string; // Added optional relationship_type property
}
