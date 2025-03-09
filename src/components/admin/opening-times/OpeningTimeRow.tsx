
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OpeningTime } from "./types";
import { HOURS, formatTimeForDisplay } from "./constants";
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
  
  // Debug - log values to help troubleshoot
  console.log(`Day ${dayLabel} - start_time: ${day.start_time}, display value: ${formatTimeForDisplay(day.start_time)}`);
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-28 font-medium">{dayLabel}</div>
        {isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <div className="flex items-center gap-2">
            <Switch
              checked={!day.is_closed}
              onCheckedChange={() => {
                console.log(`Toggling day ${dayLabel} from ${day.is_closed ? 'closed' : 'open'} to ${day.is_closed ? 'open' : 'closed'}`);
                onToggleDay(day);
              }}
              disabled={isLoading}
            />
            <span className="text-sm text-gray-500">
              {day.is_closed ? "Closed" : "Open"}
            </span>
          </div>
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
                value={formatTimeForDisplay(day.start_time)}
                onValueChange={(value) => {
                  console.log(`Changing start time for ${dayLabel} to ${value}`);
                  onTimeChange(day, 'start_time', `${value}:00`);
                }}
                disabled={isLoading}
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
                value={formatTimeForDisplay(day.end_time)}
                onValueChange={(value) => {
                  console.log(`Changing end time for ${dayLabel} to ${value}`);
                  onTimeChange(day, 'end_time', `${value}:00`);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem 
                      key={`end-${hour.value}`} 
                      value={hour.value}
                      disabled={hour.value <= formatTimeForDisplay(day.start_time)}
                    >
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
