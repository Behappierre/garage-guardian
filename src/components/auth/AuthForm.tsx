
import { AuthFormContainer } from "./AuthFormContainer";

interface AuthFormProps {
  userType: "owner" | "staff";
}

export const AuthForm = ({ userType }: AuthFormProps) => {
  return <AuthFormContainer userType={userType} />;
};
