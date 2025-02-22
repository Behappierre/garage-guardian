import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Users, 
  ActivitySquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role
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

  // Fetch metrics data
  const { data: metricsData } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: activeRepairs } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', today.toISOString())
        .lt('start_time', new Date(today.getTime() + 24*60*60*1000).toISOString());

      const { count: pendingTickets } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'received');

      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      return {
        activeRepairs: activeRepairs || 0,
        todayAppointments: todayAppointments || 0,
        pendingTickets: pendingTickets || 0,
        totalClients: totalClients || 0
      };
    }
  });

  // Fetch recent activity
  const { data: recentActivityData } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const [
        { data: recentAppointments },
        { data: recentTickets },
        { data: recentClients }
      ] = await Promise.all([
        // Recent appointments
        supabase
          .from('appointments')
          .select('id, service_type, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        
        // Recent job tickets
        supabase
          .from('job_tickets')
          .select('id, description, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        
        // Recent clients
        supabase
          .from('clients')
          .select('id, first_name, last_name, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      const activity = [
        ...(recentAppointments?.map(apt => ({
          id: apt.id,
          type: 'appointment',
          description: `New booking for ${apt.service_type}`,
          time: apt.created_at,
          icon: Calendar
        })) || []),
        ...(recentTickets?.map(ticket => ({
          id: ticket.id,
          type: 'repair',
          description: ticket.description,
          time: ticket.created_at,
          icon: Wrench
        })) || []),
        ...(recentClients?.map(client => ({
          id: client.id,
          type: 'client',
          description: `New client: ${client.first_name} ${client.last_name}`,
          time: client.created_at,
          icon: Users
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
       .slice(0, 4);

      return activity;
    }
  });

  const metrics = [
    {
      title: "Active Repairs",
      value: metricsData?.activeRepairs.toString() || "0",
      icon: Wrench,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Today's Appointments",
      value: metricsData?.todayAppointments.toString() || "0",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Orders",
      value: metricsData?.pendingTickets.toString() || "0",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Total Clients",
      value: metricsData?.totalClients.toString() || "0",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
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
            {recentActivityData?.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-center space-x-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <activity.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
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
