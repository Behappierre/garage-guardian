
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { DAYS_OF_WEEK } from "./constants";
import { OpeningTimeRow } from "./OpeningTimeRow";
import { OpeningTime } from "./types";
import { useOpeningTimeMutation } from "./useOpeningTimeMutation";

export const OpeningTimes = () => {
  const { garageId } = useAuth();
  const [savingDay, setSavingDay] = useState<number | null>(null);

  const { data: openingTimes, isLoading } = useQuery({
    queryKey: ["opening-times", garageId],
    queryFn: async () => {
      if (!garageId) return [];

      const { data, error } = await supabase
        .from("opening_times")
        .select("*")
        .eq("garage_id", garageId)
        .order("day_of_week");

      if (error) {
        toast.error("Failed to load opening times");
        throw error;
      }

      // Make sure we have all 7 days, if not return defaults
      if (!data || data.length < 7) {
        return DAYS_OF_WEEK.map(day => ({
          id: `temp-${day.value}`,
          garage_id: garageId,
          day_of_week: day.value,
          start_time: "09:00:00",
          end_time: "17:00:00",
          is_closed: day.value === 0 || day.value === 6, // Weekends closed by default
        }));
      }

      return data as OpeningTime[];
    },
    enabled: !!garageId,
  });

  const updateOpeningTimeMutation = useOpeningTimeMutation(garageId);

  const handleToggleDay = (day: OpeningTime) => {
    setSavingDay(day.day_of_week);
    updateOpeningTimeMutation.mutate(
      {
        day_of_week: day.day_of_week,
        is_closed: !day.is_closed,
        // If toggling from closed to open, set default hours
        ...(day.is_closed && { start_time: "09:00:00", end_time: "17:00:00" })
      },
      {
        onSettled: () => setSavingDay(null)
      }
    );
  };

  const handleTimeChange = (day: OpeningTime, field: 'start_time' | 'end_time', value: string) => {
    setSavingDay(day.day_of_week);
    updateOpeningTimeMutation.mutate(
      {
        day_of_week: day.day_of_week,
        [field]: value
      },
      {
        onSettled: () => setSavingDay(null)
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Opening Times</CardTitle>
          <CardDescription>Loading business hours...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span>Business Hours</span>
        </CardTitle>
        <CardDescription>
          Set your garage's opening hours. The appointment calendar will show these times as available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {openingTimes?.map((day) => (
            <OpeningTimeRow
              key={day.day_of_week}
              day={day}
              dayLabel={DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label || ''}
              savingDay={savingDay}
              onToggleDay={handleToggleDay}
              onTimeChange={handleTimeChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
