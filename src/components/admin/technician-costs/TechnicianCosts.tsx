
import { useTechnicianCosts } from "./useTechnicianCosts";
import { TechnicianCostsTable } from "./TechnicianCostsTable";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";

export const TechnicianCosts = () => {
  const { data: technicianCosts, isLoading } = useTechnicianCosts();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Technician Hourly Rates</h2>
      
      {isLoading ? (
        <LoadingState />
      ) : !technicianCosts || technicianCosts.length === 0 ? (
        <EmptyState />
      ) : (
        <TechnicianCostsTable technicianCosts={technicianCosts} />
      )}
    </div>
  );
};
