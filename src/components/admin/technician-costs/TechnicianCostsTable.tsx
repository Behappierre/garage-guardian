
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TechnicianCost } from "./types";
import { TechnicianCostRow } from "./TechnicianCostRow";

interface TechnicianCostsTableProps {
  technicianCosts: TechnicianCost[];
}

export const TechnicianCostsTable = ({ technicianCosts }: TechnicianCostsTableProps) => {
  if (!technicianCosts || technicianCosts.length === 0) {
    return <div className="text-center py-4">No technicians found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technician</TableHead>
          <TableHead>Hourly Rate</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {technicianCosts.map((cost) => (
          <TechnicianCostRow key={cost.technician_id} cost={cost} />
        ))}
      </TableBody>
    </Table>
  );
};
