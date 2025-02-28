
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TechnicianSelectorProps {
  technicianId: string | null;
  technicians?: { id: string; first_name: string; last_name: string }[];
  onTechnicianChange: (technicianId: string) => void;
}

export const TechnicianSelector = ({
  technicianId,
  technicians,
  onTechnicianChange,
}: TechnicianSelectorProps) => {
  return (
    <div>
      <Label>Assigned Technician</Label>
      <Select
        value={technicianId || ""}
        onValueChange={(value) => onTechnicianChange(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select technician" />
        </SelectTrigger>
        <SelectContent>
          {technicians?.map((technician) => (
            <SelectItem key={technician.id} value={technician.id}>
              {technician.first_name} {technician.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
