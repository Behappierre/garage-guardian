
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Wrench, Users, KeyRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userGarages, currentGarage } = useGarage();

  // Auto-redirect to dashboard if already logged in with a garage
  useEffect(() => {
    if (user && currentGarage) {
      navigate("/dashboard");
    }
  }, [user, currentGarage, navigate]);

  // Check if we're on a subdomain
  const isSubdomain = window.location.hostname.split('.').length > 2;
  const subdomain = isSubdomain ? window.location.hostname.split('.')[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <Wrench className="h-12 w-12 text-primary mr-2" />
          <h1 className="text-4xl font-bold text-gray-900">GarageWizz</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          The complete management solution for automotive repair shops
        </p>
        
        {subdomain && (
          <div className="mt-4">
            <p className="text-xl font-semibold text-primary">
              {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Garage
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {isSubdomain ? (
          // Subdomain specific view - focused on garage staff login
          <Card className="col-span-1 md:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <KeyRound className="h-6 w-6 mr-2 text-primary" />
                Staff Login
              </CardTitle>
              <CardDescription>
                Sign in to access the {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} garage dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate(`/auth?garage=${subdomain}`)} 
                className="w-full bg-primary hover:bg-primary-dark"
              >
                Sign In to {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Main domain view - garage owners can login or create new garages
          <>
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-6 w-6 mr-2 text-primary" />
                  Garage Owner
                </CardTitle>
                <CardDescription>
                  Sign in to access and manage your garages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="w-full bg-primary hover:bg-primary-dark"
                >
                  Owner Sign In
                </Button>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-6 w-6 mr-2 text-primary" />
                  New to GarageWizz?
                </CardTitle>
                <CardDescription>
                  Set up a new garage in just a few minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/create-garage")} 
                  className="w-full"
                  variant="outline"
                >
                  Create Garage
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-10 max-w-lg text-center">
        <p className="text-sm text-gray-500 mb-4">
          {isSubdomain 
            ? `Access this garage directly at ${window.location.hostname}`
            : "Garages are accessed via their own subdomains for complete data isolation"}
        </p>
        
        {isSubdomain && (
          <p className="text-sm">
            <Button 
              variant="link" 
              className="text-primary p-0"
              onClick={() => window.location.href = `https://garagewizz.com`}
            >
              Go to GarageWizz Main Site
            </Button>
          </p>
        )}
        
        {!isSubdomain && user && userGarages.length > 0 && (
          <p className="text-sm">
            <Button 
              variant="link" 
              className="text-primary p-0"
              onClick={() => navigate("/auth")}
            >
              Access Your Garages
            </Button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Index;
