
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { GarageForm } from "@/components/auth/GarageForm";

interface Garage {
  id: string;
  name: string;
  slug: string;
  address?: string;
  created_at?: string;
}

const GarageManagement = () => {
  const navigate = useNavigate();
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  useEffect(() => {
    fetchUserGarages();
  }, []);

  const fetchUserGarages = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      console.log("Current user:", user.email);
      
      // First check if there's a direct entry for this user in the garage_members table
      const { data: memberData, error: memberError } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', user.id);
      
      if (memberError) {
        console.error("Error fetching garage memberships:", memberError.message);
        throw memberError;
      }
      
      console.log("Garage memberships found:", memberData);
      
      if (!memberData || memberData.length === 0) {
        // No memberships found, check for Tractic garage
        const { data: tracticData, error: tracticError } = await supabase
          .from('garages')
          .select('*')
          .or('name.eq.Tractic,slug.eq.tractic')
          .limit(1);
          
        if (!tracticError && tracticData && tracticData.length > 0) {
          console.log("Found Tractic garage for user with no memberships:", tracticData[0]);
          
          // Add this user as a member of the Tractic garage
          if (user.email?.includes("tractic.co.uk") || user.email === "olivier@andre.org.uk") {
            const { error: addMemberError } = await supabase
              .from('garage_members')
              .upsert({ 
                user_id: user.id, 
                garage_id: tracticData[0].id, 
                role: 'owner' 
              });
              
            if (addMemberError) {
              console.error("Error adding user as Tractic garage member:", addMemberError.message);
            } else {
              console.log("Added user as Tractic garage member");
            }
          }
          
          setGarages(tracticData);
        } else {
          // No garages found for this user
          console.log("No garages found for user");
          setGarages([]);
        }
        setLoading(false);
        return;
      }
      
      // Get the list of garage IDs
      const garageIds = memberData.map(item => item.garage_id);
      
      // Fetch the full garage details
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('*')
        .in('id', garageIds);
        
      if (garageError) {
        console.error("Error fetching garages:", garageError.message);
        throw garageError;
      }
      
      // Check specifically for the Tractic garage if the user is olivier@andre.org.uk
      if (user.email === "olivier@andre.org.uk") {
        const tracticGarage = garageData?.find(g => g.name === "Tractic" || g.slug === "tractic");
        if (!tracticGarage) {
          // Try to fetch it directly
          const { data: tracticData, error: tracticError } = await supabase
            .from('garages')
            .select('*')
            .or('name.eq.Tractic,slug.eq.tractic')
            .limit(1);
            
          if (!tracticError && tracticData && tracticData.length > 0) {
            console.log("Found Tractic garage but user wasn't a member, adding manually:", tracticData[0]);
            
            // Add this user as a member of the Tractic garage
            const { error: addMemberError } = await supabase
              .from('garage_members')
              .upsert({ 
                user_id: user.id, 
                garage_id: tracticData[0].id, 
                role: 'owner' 
              });
              
            if (addMemberError) {
              console.error("Error adding user as Tractic garage member:", addMemberError.message);
            } else {
              console.log("Added user as Tractic garage member");
              
              // Add the Tractic garage to our list
              if (garageData) {
                garageData.push(tracticData[0]);
              } else {
                garageData = tracticData;
              }
            }
          }
        }
      }
      
      console.log("Fetched garages:", garageData);
      setGarages(garageData || []);
      
    } catch (error: any) {
      console.error("Error fetching garages:", error.message);
      toast.error("Failed to load your garages");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGarage = async (garageId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      // Update user's profile with selected garage
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', user.id);
        
      if (profileError) throw profileError;
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error selecting garage:", error.message);
      toast.error("Failed to select garage");
    }
  };

  const handleGarageCreated = (garageId: string) => {
    // Refresh the list of garages
    fetchUserGarages();
    setShowCreateForm(false);
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
        <Button 
          variant="outline" 
          className="absolute top-4 left-4"
          onClick={() => setShowCreateForm(false)}
        >
          Back to Garages
        </Button>
        
        <GarageForm 
          userId={(supabase.auth.getUser() as any).data?.user?.id || ""} 
          onComplete={handleGarageCreated} 
        />
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {loading ? (
            <div className="col-span-full text-center py-8">Loading your garages...</div>
          ) : garages.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="mb-4">You don't have any garages yet.</p>
            </div>
          ) : (
            garages.map((garage) => (
              <Card key={garage.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{garage.name}</CardTitle>
                  <CardDescription>{garage.address || 'No address provided'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Garage ID: {garage.slug}</p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(garage.created_at || '').toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectGarage(garage.id)}
                  >
                    Manage This Garage
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
          
          {/* Create New Garage Card */}
          <Card className="border-dashed border-2 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Create New Garage</CardTitle>
              <CardDescription>Set up a new garage business</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-gray-400"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowCreateForm(true)}
              >
                Add New Garage
              </Button>
            </CardFooter>
          </Card>
        </div>
        
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
