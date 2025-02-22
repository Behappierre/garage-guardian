
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TimeSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export const TimeSelector = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start_time">Start Time</Label>
        <Input
          id="start_time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          step="900"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_time">End Time</Label>
        <Input
          id="end_time"
          type="datetime-local"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          step="900"
          required
        />
      </div>
    </div>
  );
};
