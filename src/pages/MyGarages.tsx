
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building, LogOut, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MyGarages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userGarages } = useGarage();
  const [isSubdomain, setIsSubdomain] = useState(false);
  
  // Detect if we're on a subdomain
  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const hostParts = hostname.split('.');
    
    // For localhost testing, check if there's a subdomain in a simulated format
    // In production, we'd simply check if hostParts.length > 2
    const subdomain = isLocalhost 
      ? hostname.includes('.') 
      : hostParts.length > 2;
      
    setIsSubdomain(subdomain);
    
    // Redirect to auth if not logged in
    if (!user) {
      navigate("/auth");
    }
    
    // If on subdomain, redirect to that subdomain's auth
    if (subdomain) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const navigateToGarageSubdomain = (garageSlug: string) => {
    // Get current hostname and protocol
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    let targetUrl;
    
    // Handle local development vs production
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // For local development, simulate subdomains via URL parameter
      targetUrl = `${protocol}//${hostname}:8080/?garage=${garageSlug}`;
    } else {
      // For production, use actual subdomains
      // Extract the base domain (remove any existing subdomain)
      const hostParts = hostname.split('.');
      const baseDomain = hostParts.length > 2 
        ? hostParts.slice(1).join('.')
        : hostname;
      
      targetUrl = `${protocol}//${garageSlug}.${baseDomain}`;
    }
    
    // Log and show what's happening
    console.log(`Redirecting to: ${targetUrl}`);
    toast.info(`Redirecting to ${garageSlug} garage...`);
    
    // Open in the same window
    window.location.href = targetUrl;
  };

  // Prevent rendering if on subdomain (the useEffect will redirect)
  if (isSubdomain) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Building className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-xl font-bold text-gray-900">GarageWizz</h1>
        </div>
        <Button variant="ghost" onClick={handleSignOut} className="text-gray-600">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Garages</h1>
          
          <p className="text-gray-600 mb-8">
            Select a garage to access its management dashboard. Each garage has its own isolated environment.
          </p>
          
          {userGarages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Garages Found</h3>
              <p className="text-gray-500 mb-6">You don't have any garages set up yet.</p>
              <Button onClick={() => navigate("/create-garage")}>
                Create a Garage
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userGarages.map((garage) => (
                <Card key={garage.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 text-primary mr-2" />
                      {garage.name}
                    </CardTitle>
                    <CardDescription>
                      {garage.address || "No address provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-2">
                      Access this garage via its dedicated subdomain
                    </p>
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded mb-4">
                      {garage.slug}.garagewizz.com
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => navigateToGarageSubdomain(garage.slug)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Access Garage
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Button 
              variant="outline"
              onClick={() => navigate("/create-garage")}
            >
              Create Another Garage
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="bg-white py-4 px-6 border-t text-center text-sm text-gray-500">
        GarageWizz &copy; {new Date().getFullYear()} - The complete management solution for automotive repair shops
      </footer>
    </div>
  );
};

export default MyGarages;
