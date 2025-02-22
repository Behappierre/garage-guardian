
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Users, 
  ActivitySquare,
  Car
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
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

  const metrics = [
    {
      title: "Active Repairs",
      value: "12",
      change: "+2",
      icon: Wrench,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Today's Appointments",
      value: "8",
      change: "-1",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Orders",
      value: "5",
      change: "+3",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Total Clients",
      value: "246",
      change: "+12",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const recentActivity = [
    { id: 1, type: "repair", description: "Oil change completed", time: "10 min ago", icon: Car },
    { id: 2, type: "appointment", description: "New booking for brake inspection", time: "25 min ago", icon: Calendar },
    { id: 3, type: "repair", description: "Tire rotation in progress", time: "1 hour ago", icon: Wrench },
    { id: 4, type: "client", description: "New client registration", time: "2 hours ago", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <div key={metric.title} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <span className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">{metric.title}</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <ActivitySquare className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <activity.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
