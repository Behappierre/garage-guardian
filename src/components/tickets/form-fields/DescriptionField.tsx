
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
    <div>
      <Label>Description</Label>
      <Textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={4}
      />
    </div>
  );
};
