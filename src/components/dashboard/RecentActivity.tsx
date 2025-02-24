
import { Calendar, Wrench, Users, ActivitySquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const RecentActivity = () => {
  const { data: recentActivityData } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const [
        { data: recentAppointments },
        { data: recentTickets },
        { data: recentClients }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, service_type, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        
        supabase
          .from('job_tickets')
          .select('id, description, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        
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

  return (
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
  );
};
