
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { DAYS_OF_WEEK } from "@/components/admin/opening-times/constants";

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
        return createDefaultOpeningTimes(null);
      }

      const garageId = roleData.garage_id;
      console.log("Fetching opening times using garage_id from user_roles:", garageId);
      
      // Using raw SQL to avoid column ambiguity
      const { data, error } = await supabase.rpc('get_opening_times_for_garage', {
        p_garage_id: garageId
      });

      if (error) {
        console.error("Error loading opening times:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log("No opening times found, creating defaults for garage:", garageId);
        return createDefaultOpeningTimes(garageId);
      }

      // Check if we have all days of the week, if not, fill in the missing ones
      const existingTimes = data as OpeningTime[];
      return ensureAllDaysExist(existingTimes, garageId);
    },
    enabled: !!user?.id,
  });

  // Return garageId from the query data, or null if not available
  const garageId = query.data?.[0]?.garage_id || null;
  
  return {
    ...query,
    garageId
  };
};

// Helper function to create default opening times
const createDefaultOpeningTimes = (garageId: string | null): OpeningTime[] => {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `default-${i}`,
    garage_id: garageId || '',
    day_of_week: i,
    start_time: "09:00:00",
    end_time: "17:00:00",
    is_closed: i === 0 || i === 6, // Weekends closed by default
  }));
};

// Helper function to ensure all days exist
const ensureAllDaysExist = (existingTimes: OpeningTime[], garageId: string): OpeningTime[] => {
  // Create a map of day -> opening time
  const openingTimesByDay = new Map<number, OpeningTime>();
  existingTimes.forEach(time => {
    openingTimesByDay.set(time.day_of_week, time);
  });

  // Ensure all days exist
  const fullWeek: OpeningTime[] = [];
  
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    if (openingTimesByDay.has(dayIndex)) {
      fullWeek.push(openingTimesByDay.get(dayIndex)!);
    } else {
      // Create a default for this missing day
      fullWeek.push({
        id: `default-${dayIndex}`,
        garage_id: garageId,
        day_of_week: dayIndex,
        start_time: "09:00:00",
        end_time: "17:00:00",
        is_closed: dayIndex === 0 || dayIndex === 6, // Weekends closed by default
      });
    }
  }

  return fullWeek;
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
