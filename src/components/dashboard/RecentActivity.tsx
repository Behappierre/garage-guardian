
import { Calendar, Wrench, Users, ActivitySquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const RecentActivity = () => {
  const navigate = useNavigate();
  const { data: recentActivityData, refetch } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const [
        { data: recentAppointments },
        { data: recentTickets },
        { data: recentClients },
        { data: completedTickets }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, service_type, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        
        supabase
          .from('job_tickets')
          .select('id, description, created_at')
          .not('status', 'in', ['completed'])
          .order('created_at', { ascending: false })
          .limit(2),
        
        supabase
          .from('clients')
          .select('id, first_name, last_name, created_at')
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('job_tickets')
          .select('id, description, updated_at')
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(2)
      ]);

      const activity = [
        ...(recentAppointments?.map(apt => ({
          id: apt.id,
          type: 'appointment',
          title: 'New Appointment',
          description: apt.service_type,
          time: apt.created_at,
          icon: Calendar,
          onClick: () => navigate(`/appointments`)
        })) || []),
        ...(recentTickets?.map(ticket => ({
          id: ticket.id,
          type: 'ticket',
          title: 'New Job Ticket',
          description: ticket.description,
          time: ticket.created_at,
          icon: Wrench,
          onClick: () => navigate(`/job-tickets`)
        })) || []),
        ...(completedTickets?.map(ticket => ({
          id: ticket.id,
          type: 'completed',
          title: 'Job Ticket Completed',
          description: ticket.description,
          time: ticket.updated_at,
          icon: Wrench,
          onClick: () => navigate(`/job-tickets`)
        })) || []),
        ...(recentClients?.map(client => ({
          id: client.id,
          type: 'client',
          title: 'New Client',
          description: `${client.first_name} ${client.last_name}`,
          time: client.created_at,
          icon: Users,
          onClick: () => navigate(`/clients`)
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
       .slice(0, 4);

      return activity;
    }
  });

  // Setup real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_tickets' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <ActivitySquare className="h-5 w-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {recentActivityData?.map((activity) => (
          <div
            key={`${activity.type}-${activity.id}`}
            className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={activity.onClick}
          >
            <div className="bg-gray-100 p-2 rounded-lg">
              <activity.icon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-500 truncate">{activity.description}</p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
