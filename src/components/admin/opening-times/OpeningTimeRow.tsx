
import { HOURS } from "./constants";
import { OpeningTime } from "./types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OpeningTimeRowProps = {
  day: OpeningTime;
  dayLabel: string;
  savingDay: number | null;
  onToggleDay: (day: OpeningTime) => void;
  onTimeChange: (day: OpeningTime, field: 'start_time' | 'end_time', value: string) => void;
};

export const OpeningTimeRow = ({
  day,
  dayLabel,
  savingDay,
  onToggleDay,
  onTimeChange
}: OpeningTimeRowProps) => {
  return (
    <div className="grid grid-cols-12 items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="col-span-3">
        <div className="font-medium">{dayLabel}</div>
      </div>
      
      <div className="col-span-3 flex items-center space-x-2">
        <Switch
          id={`day-${day.day_of_week}-toggle`}
          checked={!day.is_closed}
          onCheckedChange={() => onToggleDay(day)}
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
              onValueChange={(value) => onTimeChange(day, 'start_time', value)}
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
              onValueChange={(value) => onTimeChange(day, 'end_time', value)}
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
  );
};
