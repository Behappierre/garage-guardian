
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from "sonner";

type AuthMode = "signin" | "signup";
type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";

export const useAuthForm = (userType: UserType) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("front_desk");
  const [showGarageForm, setShowGarageForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userType === "owner") {
      setRole("administrator");
    } else {
      setRole("front_desk");
    }
  }, [userType]);

  const toggleMode = () => {
    // For staff users, only allow signin mode
    if (userType === "staff" && mode === "signin") {
      // No-op for staff trying to toggle to signup
      return;
    }
    setMode(mode === "signin" ? "signup" : "signin");
  };

  const handleGarageCreationComplete = (garageId: string) => {
    navigate("/garage-management");
  };

  return {
    mode,
    setMode,
    loading,
    setLoading,
    email,
    setEmail,
    password,
    setPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    role,
    setRole,
    showGarageForm,
    setShowGarageForm,
    newUserId,
    setNewUserId,
    toggleMode,
    handleGarageCreationComplete,
    toast,
    navigate
  };
};
