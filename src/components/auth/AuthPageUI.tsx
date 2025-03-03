
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";
import { Building, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

type AuthPageUIProps = {
  effectiveGarageSlug: string | null;
  garageName: string | null;
  userGarages?: any[];
  isOwnerView?: boolean;
  initialMode?: string | null;
};

export const AuthPageUI = ({ 
  effectiveGarageSlug, 
  garageName,
  userGarages,
  isOwnerView = false,
  initialMode = null
}: AuthPageUIProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the mode from URL params or use the initialMode prop
  const mode = searchParams.get('mode') || initialMode;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Building className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-center text-3xl font-bold text-gray-900">
            GarageWizz
          </h1>
        </div>
        
        {/* Show back to home button */}
        <div className="text-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Button>
        </div>
        
        {effectiveGarageSlug && garageName && !isOwnerView && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{garageName}</h2>
            <p className="text-sm text-gray-500">
              Staff Sign In
            </p>
            <p className="text-sm text-gray-500">
              Welcome back!
            </p>
          </div>
        )}
        
        {isOwnerView && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Garage Owner Portal</h2>
            <p className="text-sm text-gray-500">
              Sign in to manage your garages
            </p>
          </div>
        )}
        
        {!effectiveGarageSlug && !isOwnerView && (
          <>
            <div className="text-center text-sm text-gray-500 mb-4">
              Garage Owner Login
            </div>
            {userGarages && userGarages.length > 0 && (
              <div className="text-center mb-4">
                <p className="text-sm text-primary">
                  You have {userGarages.length} garage{userGarages.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </>
        )}
        
        <AuthForm 
          garageSlug={effectiveGarageSlug} 
          isOwnerView={isOwnerView} 
          initialMode={mode}
        />
        
        <div className="mt-6 text-center">
          {!isOwnerView ? (
            <p className="text-sm text-gray-600">
              Don't have an account? {" "}
              <button 
                onClick={() => navigate(`/auth?mode=signup${effectiveGarageSlug ? `&garage=${effectiveGarageSlug}` : ''}`)}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Don't have a garage yet? {" "}
              <button 
                onClick={() => navigate("/create-garage")}
                className="text-primary font-medium hover:underline"
              >
                Create one here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
