
import { Wrench, Calendar, Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DashboardMetrics = () => {
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
  );
};
