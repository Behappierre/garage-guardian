
import { useTechnicianCosts } from "./useTechnicianCosts";
import { TechnicianCostsTable } from "./TechnicianCostsTable";

export const TechnicianCosts = () => {
  const { data: technicianCosts, isLoading } = useTechnicianCosts();

  if (isLoading) {
    return <div>Loading technician costs...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Technician Hourly Rates</h2>
      <TechnicianCostsTable technicianCosts={technicianCosts || []} />
    </div>
  );
};
