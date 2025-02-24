
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <WelcomeHeader />
        <DashboardMetrics />
        <RecentActivity />
      </main>
    </div>
  );
};

export default Dashboard;
