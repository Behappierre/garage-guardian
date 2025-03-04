
import { Wrench, Calendar, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardMetrics = () => {
  const { garageId } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['dashboardMetrics', garageId],
    queryFn: async () => {
      if (!garageId) {
        console.log('No garage ID available for metrics');
        return {
          activeRepairs: 0,
          todayAppointments: 0,
          completedToday: 0,
          bookedRatio: 0
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get active repairs (open job tickets) for this garage
      const { count: activeRepairs } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .not('status', 'in', ['completed', 'cancelled']);

      // Get today's appointments for this garage
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      // Get job tickets completed today for this garage
      const { count: completedToday } = await supabase
        .from('job_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('status', 'completed')
        .gte('updated_at', today.toISOString())
        .lt('updated_at', tomorrow.toISOString());

      // Calculate booked hours ratio for this garage
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('garage_id', garageId)
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
    },
    enabled: !!garageId, // Only run query when garageId is available
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  const metrics = [
    {
      title: "Active Repairs",
      value: isLoading ? "..." : (metricsData?.activeRepairs.toString() || "0"),
      icon: Wrench,
      color: "text-blue-600",
      bgColor: "bg-cyan-100",
      gradient: "from-cyan-200 to-cyan-100",
    },
    {
      title: "Today's Appointments",
      value: isLoading ? "..." : (metricsData?.todayAppointments.toString() || "0"),
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      gradient: "from-amber-200 to-amber-100",
    },
    {
      title: "Completed Today",
      value: isLoading ? "..." : (metricsData?.completedToday.toString() || "0"),
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      gradient: "from-emerald-200 to-emerald-100",
    },
    {
      title: "Booked Hours Ratio",
      value: isLoading ? "..." : `${metricsData?.bookedRatio || 0}%`,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      gradient: "from-purple-200 to-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {metrics.map((metric) => (
        <div 
          key={metric.title} 
          className={`rounded-lg shadow-sm p-6 flex flex-col min-w-0 bg-gradient-to-br ${metric.gradient} transition-transform duration-200 hover:scale-105`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${metric.bgColor} shrink-0`}>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </div>
            <h3 className="text-sm font-medium text-gray-800 truncate">{metric.title}</h3>
          </div>
          <p className={`text-3xl font-semibold mt-4 ${metric.color}`}>{metric.value}</p>
        </div>
      ))}
    </div>
  );
};
