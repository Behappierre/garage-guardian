
import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  garageId: string | null;
  refreshGarageId: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  garageId: null,
  refreshGarageId: async () => {},
});
