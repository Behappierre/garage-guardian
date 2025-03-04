
import { Calendar, Wrench, Users, ActivitySquare, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

type ActivityBase = {
  id: string;
  type: 'appointment' | 'ticket' | 'completed' | 'client';
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  onClick: () => void;
};

type AppointmentActivity = ActivityBase & {
  type: 'appointment';
  client?: {
    first_name: string;
    last_name: string;
  } | null;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    license_plate: string | null;
  } | null;
  appointmentTime: string;
};

type OtherActivity = ActivityBase & {
  type: 'ticket' | 'completed' | 'client';
};

type Activity = AppointmentActivity | OtherActivity;

export const RecentActivity = () => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { garageId } = useAuth();

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const { data: recentActivityData, refetch, isLoading } = useQuery({
    queryKey: ['recentActivity', garageId],
    queryFn: async () => {
      if (!garageId) {
        console.log('No garage ID available for recent activity');
        return [];
      }

      const [
        { data: recentAppointments },
        { data: recentTickets },
        { data: recentClients },
        { data: completedTickets }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            id, 
            service_type, 
            created_at,
            start_time,
            client:clients(first_name, last_name),
            vehicle:vehicles(make, model, year, license_plate)
          `)
          .eq('garage_id', garageId)
          .order('created_at', { ascending: false })
          .limit(2),
        
        supabase
          .from('job_tickets')
          .select('id, description, created_at')
          .eq('garage_id', garageId)
          .not('status', 'in', ['completed'])
          .order('created_at', { ascending: false })
          .limit(2),
        
        supabase
          .from('clients')
          .select('id, first_name, last_name, created_at')
          .eq('garage_id', garageId)
          .order('created_at', { ascending: false })
          .limit(1),

        supabase
          .from('job_tickets')
          .select('id, description, updated_at')
          .eq('garage_id', garageId)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(2)
      ]);

      const activity: Activity[] = [
        ...(recentAppointments?.map(apt => ({
          id: apt.id,
          type: 'appointment' as const,
          title: 'New Appointment',
          description: apt.service_type,
          time: apt.created_at,
          appointmentTime: apt.start_time,
          client: apt.client,
          vehicle: apt.vehicle,
          icon: Calendar,
          onClick: () => navigate(`/dashboard/appointments/${apt.id}`)
        })) || []),
        ...(recentTickets?.map(ticket => ({
          id: ticket.id,
          type: 'ticket' as const,
          title: 'New Job Ticket',
          description: ticket.description,
          time: ticket.created_at,
          icon: Wrench,
          onClick: () => navigate(`/dashboard/job-tickets/${ticket.id}`)
        })) || []),
        ...(completedTickets?.map(ticket => ({
          id: ticket.id,
          type: 'completed' as const,
          title: 'Job Ticket Completed',
          description: ticket.description,
          time: ticket.updated_at,
          icon: Wrench,
          onClick: () => navigate(`/dashboard/job-tickets/${ticket.id}`)
        })) || []),
        ...(recentClients?.map(client => ({
          id: client.id,
          type: 'client' as const,
          title: 'New Client',
          description: `${client.first_name} ${client.last_name}`,
          time: client.created_at,
          icon: Users,
          onClick: () => navigate(`/dashboard/clients/${client.id}`)
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
       .slice(0, 4);

      return activity;
    },
    enabled: !!garageId // Only run query when garageId is available
  });

  // Setup real-time subscriptions
  useEffect(() => {
    if (!garageId) return;

    const channel = supabase
      .channel(`dashboard-activity-${garageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `garage_id=eq.${garageId}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_tickets', filter: `garage_id=eq.${garageId}` }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `garage_id=eq.${garageId}` }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, garageId]);

  // Define activity type colors
  const getActivityStyles = (type: Activity['type']) => {
    switch(type) {
      case 'appointment':
        return {
          bg: 'bg-gradient-to-br from-sky-100 to-blue-50',
          icon: 'bg-sky-200 text-sky-600',
        };
      case 'ticket':
        return {
          bg: 'bg-gradient-to-br from-amber-100 to-amber-50',
          icon: 'bg-amber-200 text-amber-600',
        };
      case 'completed':
        return {
          bg: 'bg-gradient-to-br from-green-100 to-green-50',
          icon: 'bg-green-200 text-green-600',
        };
      case 'client':
        return {
          bg: 'bg-gradient-to-br from-purple-100 to-purple-50',
          icon: 'bg-purple-200 text-purple-600',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-100 to-gray-50',
          icon: 'bg-gray-200 text-gray-600',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg shadow-sm p-6 text-left bg-white">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm p-6 text-left bg-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <ActivitySquare className="h-5 w-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {recentActivityData && recentActivityData.length > 0 ? (
          recentActivityData.map((activity) => {
            const isExpanded = expandedItems.has(activity.id);
            const ActivityIcon = activity.icon;
            const styles = getActivityStyles(activity.type);
            
            return (
              <div
                key={`${activity.type}-${activity.id}`}
                className={`${styles.bg} hover:shadow-md rounded-lg border border-gray-100 p-4 transition-all cursor-pointer`}
                onClick={activity.onClick}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${styles.icon} p-2 rounded-lg shrink-0`}>
                    <ActivityIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(activity.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                    </p>
                    <div
                      className={`mt-2 space-y-2 text-sm text-gray-600 transition-all duration-200 ${
                        isExpanded ? 'block' : 'hidden'
                      }`}
                    >
                      {activity.type === 'appointment' ? (
                        <>
                          {activity.client && (
                            <p>Client: {activity.client.first_name} {activity.client.last_name}</p>
                          )}
                          {activity.vehicle && (
                            <>
                              <p>Vehicle: {activity.vehicle.year} {activity.vehicle.make} {activity.vehicle.model}</p>
                              {activity.vehicle.license_plate && (
                                <p>Registration: {activity.vehicle.license_plate}</p>
                              )}
                            </>
                          )}
                          {activity.appointmentTime && (
                            <p>Appointment: {format(new Date(activity.appointmentTime), 'PPP p')}</p>
                          )}
                          <p>Service: {activity.description}</p>
                        </>
                      ) : (
                        <p>{activity.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity for this garage</p>
          </div>
        )}
      </div>
    </div>
  );
};
