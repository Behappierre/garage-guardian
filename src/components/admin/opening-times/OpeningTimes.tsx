
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { DAYS_OF_WEEK } from "./constants";
import { OpeningTimeRow } from "./OpeningTimeRow";
import { OpeningTime } from "./types";
import { useOpeningTimeMutation } from "./useOpeningTimeMutation";
import { useOpeningTimes } from "@/hooks/use-opening-times";

export const OpeningTimes = () => {
  const { data: openingTimes, isLoading, error } = useOpeningTimes();
  const [savingDay, setSavingDay] = useState<number | null>(null);
  
  const updateOpeningTimeMutation = useOpeningTimeMutation();

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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Opening Times</CardTitle>
          <CardDescription>We couldn't load your business hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
        </CardContent>
      </Card>
    );
  }

  if (!openingTimes || openingTimes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Opening Times</CardTitle>
          <CardDescription>No business hours found.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please select a garage to manage business hours.</p>
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
          {openingTimes.map((day) => (
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
