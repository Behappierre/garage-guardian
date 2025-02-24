
import { Wrench, Calendar, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DashboardMetrics = () => {
  const { data: metricsData } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get active repairs (open job tickets)
      const { count: activeRepairs } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', ['completed', 'cancelled']);

      // Get today's appointments
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      // Get job tickets completed today
      const { count: completedToday } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', today.toISOString())
        .lt('updated_at', tomorrow.toISOString());

      // Calculate booked hours ratio
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      // Calculate total booked minutes for today
      const totalBookedMinutes = appointments?.reduce((total, appointment) => {
        const start = new Date(appointment.start_time);
        const end = new Date(appointment.end_time);
        return total + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0) || 0;

      // Calculate ratio (assuming 3 bays and 8 working hours)
      const totalPossibleMinutes = 3 * 8 * 60; // 3 bays * 8 hours * 60 minutes
      const bookedRatio = totalBookedMinutes / totalPossibleMinutes;

      return {
        activeRepairs: activeRepairs || 0,
        todayAppointments: todayAppointments || 0,
        completedToday: completedToday || 0,
        bookedRatio: Math.round(bookedRatio * 100)
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
      title: "Completed Today",
      value: metricsData?.completedToday.toString() || "0",
      icon: CheckCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Booked Hours Ratio",
      value: `${metricsData?.bookedRatio || 0}%`,
      icon: Clock,
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
