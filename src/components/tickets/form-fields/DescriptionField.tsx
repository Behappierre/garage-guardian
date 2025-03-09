
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <div className="relative">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter job description and details"
          className={`resize-none ${isExpanded ? "min-h-[300px]" : "min-h-[120px]"}`}
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
      
      {/* Only show the scrollable preview when expanded and there's content */}
      {isExpanded && description.trim().length > 0 && (
        <div className="mt-2 border rounded p-2">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <ScrollArea className="h-[200px] w-full p-2">
            <div className="text-sm text-left whitespace-pre-wrap">
              {description}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
