
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DescriptionFieldProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

export const DescriptionField = ({
  description,
  onDescriptionChange,
}: DescriptionFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Enter job description and details"
        className="min-h-[120px]"
      />
    </div>
  );
};
