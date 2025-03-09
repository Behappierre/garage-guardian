
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

interface DescriptionFieldProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

export const DescriptionField = ({
  description,
  onDescriptionChange,
}: DescriptionFieldProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="description">Description</Label>
      <div className="relative w-full">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter job description and details"
          className={`resize-none w-full ${isExpanded ? "min-h-[300px]" : "min-h-[120px]"}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute bottom-2 right-2 h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
