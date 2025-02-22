
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ServiceTypeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const ServiceTypeInput = ({ value, onChange }: ServiceTypeInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="service_type">Service Type</Label>
      <Input
        id="service_type"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
};
