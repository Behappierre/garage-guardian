
import { AuthFormContainer } from "./forms/AuthFormContainer";

interface AuthFormProps {
  garageSlug?: string | null;
}

export const AuthForm = ({ garageSlug }: AuthFormProps) => {
  return <AuthFormContainer garageSlug={garageSlug} />;
};
