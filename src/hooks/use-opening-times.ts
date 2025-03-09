
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
  const { garageId } = useAuth();

  const query = useQuery({
    queryKey: ["opening-times", garageId],
    queryFn: async () => {
      if (!garageId) return [];

      // Fix the ambiguous column reference by specifying the table name in the where clause
      // but not in the select clause to avoid type issues
      const { data, error } = await supabase
        .from("opening_times")
        .select("id, garage_id, day_of_week, start_time, end_time, is_closed")
        .eq("opening_times.garage_id", garageId)
        .order("day_of_week");

      if (error) {
        console.error("Error loading opening times:", error);
        throw error;
      }

      // Default opening times if none set (9am-5pm weekdays, closed weekends)
      if (!data || data.length === 0) {
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
    enabled: !!garageId,
  });

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
