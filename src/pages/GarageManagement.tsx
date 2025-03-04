
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { useGarages } from "@/hooks/garage/useGarages";
import { GarageList } from "@/components/garage/GarageList";
import { CreateGarageForm } from "@/components/garage/CreateGarageForm";

const GarageManagement = () => {
  const navigate = useNavigate();
  const { garages, loading, refreshGarages } = useGarages();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check if the user is an administrator
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
        
        // Fetch user role
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

        // If we have a stored garage ID in profile, check for the Tractic garage membership
        if (user.email?.toLowerCase().includes("tractic") || user.email === "olivier@andre.org.uk") {
          // Look for Tractic garage
          const { data: tracticData, error: tracticError } = await supabase
            .from('garages')
            .select('id')
            .or('name.ilike.tractic,slug.ilike.tractic')
            .limit(1);
            
          if (!tracticError && tracticData && tracticData.length > 0) {
            // Try to add user as a member of the Tractic garage if not already
            const { data: memberExists, error: memberCheckError } = await supabase
              .from('garage_members')
              .select('id')
              .eq('user_id', user.id)
              .eq('garage_id', tracticData[0].id)
              .limit(1);
              
            if (!memberCheckError && (!memberExists || memberExists.length === 0)) {
              console.log("Adding user to Tractic garage membership");
              // Add the user as an owner of the Tractic garage
              await supabase
                .from('garage_members')
                .upsert({
                  user_id: user.id,
                  garage_id: tracticData[0].id,
                  role: 'owner'
                });
            }
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
  }, [navigate]);

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
    return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>;
  }

  if (showCreateForm) {
    return (
      <CreateGarageForm 
        onBack={() => setShowCreateForm(false)} 
        onComplete={handleGarageCreated} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <PageHeader 
          title="Your Garages" 
          description="Select a garage to manage or create a new one"
        />
        
        <GarageList 
          garages={garages}
          loading={loading}
          onSelectGarage={handleSelectGarage}
          onCreateGarage={() => setShowCreateForm(true)}
        />
        
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
