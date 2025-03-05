
import { useAuthState } from "@/hooks/auth/useAuthState";
import { AuthContext } from "@/context/AuthContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from "@/hooks/auth/useAuth";
