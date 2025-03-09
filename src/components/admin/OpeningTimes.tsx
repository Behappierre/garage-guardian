
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return {
    value: `${hour.toString().padStart(2, '0')}:00:00`,
    label: `${hour12}:00 ${ampm}`
  };
});

type OpeningTime = {
  id: string;
  garage_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

export const OpeningTimes = () => {
  const { garageId } = useAuth();
  const queryClient = useQueryClient();
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

  const updateOpeningTimeMutation = useMutation({
    mutationFn: async (openingTime: Partial<OpeningTime> & { day_of_week: number }) => {
      if (!garageId) throw new Error("No garage selected");

      const { day_of_week, ...updateData } = openingTime;
      
      // Try to find if this day already exists
      const { data: existingTime } = await supabase
        .from("opening_times")
        .select("id")
        .eq("garage_id", garageId)
        .eq("day_of_week", day_of_week)
        .single();

      if (existingTime) {
        // Update existing record
        const { data, error } = await supabase
          .from("opening_times")
          .update({ ...updateData })
          .eq("id", existingTime.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record - ensure all required fields are present
        const { data, error } = await supabase
          .from("opening_times")
          .insert({
            garage_id: garageId,
            day_of_week: day_of_week,
            start_time: openingTime.start_time || "09:00:00", // Provide default if not specified
            end_time: openingTime.end_time || "17:00:00", // Provide default if not specified
            is_closed: openingTime.is_closed !== undefined ? openingTime.is_closed : false
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-times", garageId] });
      toast.success("Opening times updated successfully");
      setSavingDay(null);
    },
    onError: (error) => {
      console.error("Error updating opening times:", error);
      toast.error("Failed to update opening times");
      setSavingDay(null);
    },
  });

  const handleToggleDay = (day: OpeningTime) => {
    setSavingDay(day.day_of_week);
    updateOpeningTimeMutation.mutate({
      day_of_week: day.day_of_week,
      is_closed: !day.is_closed,
      // If toggling from closed to open, set default hours
      ...(day.is_closed && { start_time: "09:00:00", end_time: "17:00:00" })
    });
  };

  const handleTimeChange = (day: OpeningTime, field: 'start_time' | 'end_time', value: string) => {
    setSavingDay(day.day_of_week);
    updateOpeningTimeMutation.mutate({
      day_of_week: day.day_of_week,
      [field]: value
    });
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
        <div className="space-y-4">
          {openingTimes?.map((day) => (
            <div key={day.day_of_week} className="grid grid-cols-12 items-center gap-4 py-2 border-b border-gray-100 last:border-0">
              <div className="col-span-3">
                <div className="font-medium">{DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label}</div>
              </div>
              
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id={`day-${day.day_of_week}-toggle`}
                  checked={!day.is_closed}
                  onCheckedChange={() => handleToggleDay(day)}
                  disabled={savingDay === day.day_of_week}
                />
                <Label htmlFor={`day-${day.day_of_week}-toggle`}>
                  {day.is_closed ? "Closed" : "Open"}
                </Label>
              </div>
              
              {!day.is_closed && (
                <>
                  <div className="col-span-3">
                    <Select
                      value={day.start_time}
                      onValueChange={(value) => handleTimeChange(day, 'start_time', value)}
                      disabled={savingDay === day.day_of_week}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Start Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={`start-${day.day_of_week}-${hour.value}`} value={hour.value}>
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Select
                      value={day.end_time}
                      onValueChange={(value) => handleTimeChange(day, 'end_time', value)}
                      disabled={savingDay === day.day_of_week}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="End Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem 
                            key={`end-${day.day_of_week}-${hour.value}`} 
                            value={hour.value}
                            disabled={hour.value <= day.start_time}
                          >
                            {hour.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {day.is_closed && (
                <div className="col-span-6 text-gray-500 italic">
                  Closed All Day
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
