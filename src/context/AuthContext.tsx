
import { createContext } from "react";

type AuthContextType = {
  session: any;
  user: any;
  loading: boolean;
  garageId: string | null;
  userRole: string | null;
  refreshGarageId: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  garageId: null,
  userRole: null,
  refreshGarageId: async () => {},
});
