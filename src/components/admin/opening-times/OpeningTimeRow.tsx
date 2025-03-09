
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OpeningTime } from "./types";
import { HOURS } from "./constants";
import { Skeleton } from "@/components/ui/skeleton";

interface OpeningTimeRowProps {
  day: OpeningTime;
  dayLabel: string;
  savingDay: number | null;
  onToggleDay: (day: OpeningTime) => void;
  onTimeChange: (day: OpeningTime, field: 'start_time' | 'end_time', value: string) => void;
}

export const OpeningTimeRow: React.FC<OpeningTimeRowProps> = ({
  day,
  dayLabel,
  savingDay,
  onToggleDay,
  onTimeChange,
}) => {
  const isLoading = savingDay === day.day_of_week;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-28 font-medium">{dayLabel}</div>
        {isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <Switch
            checked={!day.is_closed}
            onCheckedChange={() => onToggleDay(day)}
          />
        )}
      </div>

      {!day.is_closed && (
        <div className="flex items-center gap-2">
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-24" />
              <span className="text-gray-500">to</span>
              <Skeleton className="h-9 w-24" />
            </>
          ) : (
            <>
              <Select
                value={day.start_time}
                onValueChange={(value) => onTimeChange(day, 'start_time', value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={`start-${hour.value}`} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-gray-500">to</span>

              <Select
                value={day.end_time}
                onValueChange={(value) => onTimeChange(day, 'end_time', value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={`end-${hour.value}`} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      )}
    </div>
  );
};
