
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const NotesInput = ({ value, onChange }: NotesInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        id="notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
