
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";

interface UserRole {
  role: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setUserRole(data.role);
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error fetching user role",
          description: error.message
        });
      }
    };

    fetchUserRole();
  }, [user, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Welcome to your Dashboard
          </h1>
          
          {userRole && (
            <div className="bg-primary/5 rounded-md p-4 mb-6">
              <p className="text-primary font-medium">
                Current Role: {userRole}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Administrator Section */}
            {userRole === 'administrator' && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">User Management</h3>
                  <p className="text-blue-700">Manage user roles and permissions</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">System Settings</h3>
                  <p className="text-green-700">Configure system-wide settings</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">Analytics</h3>
                  <p className="text-purple-700">View system analytics and reports</p>
                </div>
              </>
            )}

            {/* Technician Section */}
            {userRole === 'technician' && (
              <>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">Active Repairs</h3>
                  <p className="text-yellow-700">View and manage current repair jobs</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Parts Inventory</h3>
                  <p className="text-green-700">Check and manage parts inventory</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Work Orders</h3>
                  <p className="text-blue-700">View assigned work orders</p>
                </div>
              </>
            )}

            {/* Front Desk Section */}
            {userRole === 'front_desk' && (
              <>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold text-indigo-900 mb-2">Appointments</h3>
                  <p className="text-indigo-700">Manage customer appointments</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <h3 className="font-semibold text-pink-900 mb-2">Customer Service</h3>
                  <p className="text-pink-700">Handle customer inquiries and requests</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2">Scheduling</h3>
                  <p className="text-orange-700">Manage daily service schedule</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
