
import { AuthFormContainer } from "./forms/AuthFormContainer";

interface AuthFormProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
}

export const AuthForm = ({ garageSlug, isOwnerView = false }: AuthFormProps) => {
  return <AuthFormContainer garageSlug={garageSlug} isOwnerView={isOwnerView} />;
};
