
import { AuthFormContainer } from "./forms/AuthFormContainer";

interface AuthFormProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
  initialMode?: string | null;
}

export const AuthForm = ({ garageSlug, isOwnerView = false, initialMode = null }: AuthFormProps) => {
  return <AuthFormContainer garageSlug={garageSlug} isOwnerView={isOwnerView} initialMode={initialMode} />;
};
