
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
  const handleTimeChange = (value: string, onChange: (time: string) => void) => {
    const date = new Date(value);
    const minutes = date.getMinutes();
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(minutes / 15) * 15;
    date.setMinutes(roundedMinutes);
    
    // Format the date back to string
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    
    const formattedTime = `${year}-${month}-${day}T${hours}:${mins}`;
    onChange(formattedTime);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start_time">Start Time</Label>
        <Input
          id="start_time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => handleTimeChange(e.target.value, onStartTimeChange)}
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
          onChange={(e) => handleTimeChange(e.target.value, onEndTimeChange)}
          step="900"
          required
        />
      </div>
    </div>
  );
};
