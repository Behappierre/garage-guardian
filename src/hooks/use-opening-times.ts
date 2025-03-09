
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";

export type OpeningTime = {
  id: string;
  garage_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

export const useOpeningTimes = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["opening-times", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First, get the garage_id from user_roles table
      // Use .limit(1).single() instead of .maybeSingle() to get the first record
      // even if there are multiple matches
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("garage_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        throw roleError;
      }

      // If no garage_id found in user_roles, log this clearly and return empty array
      if (!roleData?.garage_id) {
        console.error("No garage ID found in user_roles for user:", user.id);
        return [];
      }

      const garageId = roleData.garage_id;
      console.log("Fetching opening times using garage_id from user_roles:", garageId);
      
      // Fetch opening times using the garage_id from user_roles
      // Use regular .eq() without table prefixing
      const { data, error } = await supabase
        .from("opening_times")
        .select("*")
        .eq("garage_id", garageId)
        .order("day_of_week", { ascending: true });

      if (error) {
        console.error("Error loading opening times:", error);
        throw error;
      }

      // Default opening times if none set (9am-5pm weekdays, closed weekends)
      if (!data || data.length === 0) {
        console.log("No opening times found, creating defaults for garage:", garageId);
        return Array.from({ length: 7 }, (_, i) => ({
          id: `default-${i}`,
          garage_id: garageId,
          day_of_week: i,
          start_time: "09:00:00",
          end_time: "17:00:00",
          is_closed: i === 0 || i === 6, // Weekends closed by default
        }));
      }

      return data as OpeningTime[];
    },
    enabled: !!user?.id,
  });

  // Return garageId from the query data, or try to get it from the query itself
  const garageId = query.data?.[0]?.garage_id || null;
  
  return {
    ...query,
    garageId
  };
};

// Helper function to convert time string (HH:MM:SS) to hour number
export const timeToHour = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours + minutes / 60 + seconds / 3600;
};

// Helper function to check if a given datetime is within business hours
export const isWithinBusinessHours = (
  date: Date, 
  openingTimes: OpeningTime[]
): boolean => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTimeAsHours = hours + minutes / 60;

  // Find the opening time for this day of week
  const dayOpeningTime = openingTimes.find(ot => ot.day_of_week === dayOfWeek);

  // If no opening time found or the day is marked as closed, it's outside business hours
  if (!dayOpeningTime || dayOpeningTime.is_closed) {
    return false;
  }

  // Check if the time is within the opening hours
  const startHour = timeToHour(dayOpeningTime.start_time);
  const endHour = timeToHour(dayOpeningTime.end_time);

  return currentTimeAsHours >= startHour && currentTimeAsHours < endHour;
};
