
import { Skeleton } from "@/components/ui/skeleton";

export const AuthLoading = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Checking authentication...</p>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
