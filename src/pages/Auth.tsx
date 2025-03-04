
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";

const Auth = () => {
  const { isChecking, authError, userType } = useAuthCheck();

  if (isChecking) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        {authError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {authError}
          </div>
        )}
        <AuthForm userType={userType} />
      </div>
    </div>
  );
};

export default Auth;
