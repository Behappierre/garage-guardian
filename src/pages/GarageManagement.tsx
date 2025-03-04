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
      
      // Fetch garages where user is an administrator
      const { data, error } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT g.id, g.name, g.slug, g.address, g.created_at 
          FROM garages g
          JOIN garage_members gm ON g.id = gm.garage_id
          WHERE gm.user_id = '${user.id}'
          AND gm.role = 'administrator'
          ORDER BY g.created_at DESC
        `
      });
      
      if (error) throw error;
      
      // Parse the result
      let userGarages: Garage[] = [];
      if (data && Array.isArray(data)) {
        userGarages = data.map(row => {
          const jsonRow = row as Record<string, any>;
          return {
            id: jsonRow.id as string,
            name: jsonRow.name as string,
            slug: jsonRow.slug as string,
            address: jsonRow.address as string,
            created_at: jsonRow.created_at as string
          };
        });
      }
      
      setGarages(userGarages);
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
