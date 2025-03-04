
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { useGarages } from "@/hooks/garage/useGarages";
import { GarageList } from "@/components/garage/GarageList";
import { CreateGarageForm } from "@/components/garage/CreateGarageForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";

const GarageManagement = () => {
  const navigate = useNavigate();
  const { garages, loading, error, refreshGarages } = useGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Check if the user is an administrator or Tractic user
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        console.log("Starting authentication check...");
        setCheckingAccess(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error getting user:", userError.message);
          setDebugInfo(`Auth error: ${userError.message}`);
          throw userError;
        }
        
        if (!user) {
          console.log("No authenticated user found");
          toast.error("You must be logged in to access this page");
          navigate("/auth?type=owner");
          return;
        }
        
        console.log("Authenticated user:", user.email);
        
        // Detect Tractic users by email
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        // For Tractic users, bypass the strict role checking and proceed directly
        if (isTracticUser) {
          console.log("Detected Tractic user, bypassing strict role check for page access");
          setCheckingAccess(false);
          return;
        }
        
        // For non-Tractic users, check if they have administrator role
        try {
          console.log("Checking administrator role for non-Tractic user");
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          if (roleError) {
            console.error("Error checking admin access:", roleError.message);
            setDebugInfo(`Role check error: ${roleError.message}`);
            throw roleError;
          }
          
          if (roleData?.role !== 'administrator') {
            console.log("User is not an administrator:", roleData?.role);
            toast.error("Only administrators can access garage management");
            navigate("/auth?type=owner");
            return;
          }
          
          console.log("User is an administrator, access granted");
        } catch (error: any) {
          console.error("Error checking admin role:", error.message);
          setDebugInfo(`Role check exception: ${error.message}`);
          
          // If we cannot check the role, and it's a Tractic user, proceed anyway
          if (!isTracticUser) {
            toast.error("Authentication error");
            navigate("/auth?type=owner");
            return;
          }
        }
      } catch (error: any) {
        console.error("Error in overall access check:", error.message);
        setDebugInfo(`Access check error: ${error.message}`);
        toast.error("Authentication error");
        navigate("/auth?type=owner");
      } finally {
        console.log("Completed authentication check");
        setCheckingAccess(false);
      }
    };
    
    checkAdminAccess();
  }, [navigate]);

  const handleSelectGarage = async (garageId: string) => {
    try {
      console.log("Selecting garage:", garageId);
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting user for garage selection:", userError.message);
        throw userError;
      }
      
      if (!user) {
        console.log("No authenticated user found for garage selection");
        navigate("/auth?type=owner");
        return;
      }
      
      console.log("Updating user profile with selected garage");
      // Update user's profile with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', user.id);
        
      if (profileError) {
        console.error("Error updating profile with garage:", profileError.message);
        throw profileError;
      }
      
      console.log("Successfully selected garage");
      toast.success("Garage selected successfully");
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error selecting garage:", error.message);
      setDebugInfo(`Garage selection error: ${error.message}`);
      toast.error("Failed to select garage");
    }
  };

  const handleGarageCreated = (garageId: string) => {
    console.log("Garage created, refreshing list:", garageId);
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  if (checkingAccess) {
    console.log("Rendering loading state while checking access");
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Checking Access</h2>
            <p className="text-gray-500">Please wait while we verify your permissions</p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log("Rendering loading state while fetching garages");
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Loading Garages</h2>
            <p className="text-gray-500">Please wait while we retrieve your data</p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <PageHeader 
          title="Your Garages" 
          description="Select a garage to manage or create a new one"
        />
        
        {debugInfo && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Debug information: {debugInfo}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant={error.includes("Using default garage") ? "default" : "destructive"} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {garages.length === 0 && !error && (
          <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
            <InfoIcon className="h-4 w-4 text-yellow-700" />
            <AlertDescription className="text-yellow-700">
              No garages found. You can create a new garage using the button below.
            </AlertDescription>
          </Alert>
        )}
        
        <GarageList 
          garages={garages}
          loading={loading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
        />
        
        {showCreateForm && (
          <CreateGarageForm 
            onBack={() => setShowCreateForm(false)}
            onComplete={handleGarageCreated}
          />
        )}
        
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GarageManagement;
