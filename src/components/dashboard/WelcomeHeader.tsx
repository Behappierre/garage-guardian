
import { useAuth } from "@/components/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const WelcomeHeader = () => {
  const { user, garageId } = useAuth();
  
  const { data: garageData, isLoading: isGarageLoading } = useQuery({
    queryKey: ['garageInfo', garageId],
    queryFn: async () => {
      if (!garageId) return null;
      
      const { data, error } = await supabase
        .from('garages')
        .select('name')
        .eq('id', garageId)
        .single();
        
      if (error) {
        console.error('Error fetching garage info:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!garageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const firstName = userProfile?.first_name || user?.email?.split('@')[0] || 'there';
  const garageName = garageData?.name || 'your workshop';
  
  if (isProfileLoading || isGarageLoading) {
    return (
      <div className="mb-6">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-64" />
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold text-cyan-600">
        Good {getTimeOfDay()}, {firstName}!
      </h1>
      <p className="text-gray-600">
        Here's what's happening today in {garageName}.
      </p>
    </div>
  );
};

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
