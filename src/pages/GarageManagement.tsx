
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

const GarageManagement = () => {
  const navigate = useNavigate();
  const { garages, loading, error, refreshGarages } = useGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check if the user is an administrator or Tractic user
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setCheckingAccess(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("You must be logged in to access this page");
          navigate("/auth?type=owner");
          return;
        }
        
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
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          if (roleError) {
            console.error("Error checking admin access:", roleError.message);
            throw roleError;
          }
          
          if (roleData?.role !== 'administrator') {
            toast.error("Only administrators can access garage management");
            navigate("/auth?type=owner");
            return;
          }
        } catch (error: any) {
          console.error("Error checking admin role:", error.message);
          // If we cannot check the role, and it's a Tractic user, proceed anyway
          if (!isTracticUser) {
            toast.error("Authentication error");
            navigate("/auth?type=owner");
            return;
          }
        }
      } catch (error: any) {
        console.error("Error checking admin access:", error.message);
        toast.error("Authentication error");
        navigate("/auth?type=owner");
      } finally {
        setCheckingAccess(false);
      }
    };
    
    checkAdminAccess();
  }, [navigate, refreshGarages]);

  const handleSelectGarage = async (garageId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth?type=owner");
        return;
      }
      
      // Update user's profile with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', user.id);
        
      if (profileError) throw profileError;
      
      toast.success("Garage selected successfully");
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error selecting garage:", error.message);
      toast.error("Failed to select garage");
    }
  };

  const handleGarageCreated = (garageId: string) => {
    refreshGarages();
    setShowCreateForm(false);
    toast.success("Garage created successfully");
  };

  if (checkingAccess || loading) {
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
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-700">
              {error} 
            </p>
          </div>
        )}
        
        {garages.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-yellow-700">
              No garages found. You can create a new garage using the button below.
            </p>
          </div>
        )}
        
        <GarageList 
          garages={garages}
          loading={loading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
        />
        
        {showCreateForm && (
          <CreateGarageForm 
            onCancel={() => setShowCreateForm(false)}
            onGarageCreated={handleGarageCreated}
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
