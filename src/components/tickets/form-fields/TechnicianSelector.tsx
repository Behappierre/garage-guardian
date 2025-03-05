
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/auth/AuthProvider";

interface TechnicianSelectorProps {
  technicianId: string | null;
  technicians?: {
    id: string;
    first_name: string;
    last_name: string;
  }[];
  onTechnicianChange: (technicianId: string) => void;
  isLoading?: boolean;
}

export const TechnicianSelector = ({
  technicianId,
  technicians,
  onTechnicianChange,
  isLoading = false,
}: TechnicianSelectorProps) => {
  const { garageId } = useAuth();
  
  return (
    <div>
      <Label>Assigned Technician</Label>
      <Select
        value={technicianId || ""}
        onValueChange={(value) => {
          if (value && value !== "no-technicians") {
            onTechnicianChange(value);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading technicians..." : "Assign a technician"} />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {technicians && technicians.length > 0 ? (
              technicians.map((technician) => {
                // Skip any technician with a null or empty ID
                if (!technician.id) return null;
                
                return (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.first_name} {technician.last_name}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-technicians">No technicians available</SelectItem>
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
};
