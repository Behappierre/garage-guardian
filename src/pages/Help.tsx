
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { LucideIcon, HelpCircle, Calendar, Users, Wrench, Settings } from "lucide-react";

interface HelpTopic {
  title: string;
  description: string;
  path: string;
  Icon: LucideIcon;
}

const helpTopics: HelpTopic[] = [
  {
    title: "Getting Started",
    description: "Learn the basics of using GarageGuardian",
    path: "/dashboard/help/getting-started",
    Icon: HelpCircle
  },
  {
    title: "Appointments",
    description: "Schedule and manage service appointments",
    path: "/dashboard/help/appointments",
    Icon: Calendar
  },
  {
    title: "Client Management",
    description: "Track clients and their vehicles",
    path: "/dashboard/help/clients",
    Icon: Users
  },
  {
    title: "Job Tickets",
    description: "Create and manage service tickets",
    path: "/dashboard/help/job-tickets",
    Icon: Wrench
  },
  {
    title: "Settings & Configuration",
    description: "Customize your workspace preferences",
    path: "/dashboard/help/settings",
    Icon: Settings
  }
];

const Help = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-6">
            <div className="prose max-w-none mb-8">
              <h1 className="text-3xl font-bold mb-4">Help Center</h1>
              <p className="text-gray-600 mb-8">
                Welcome to GarageGuardian Help Center. Choose a topic below to learn more about our features and capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {helpTopics.map((topic) => (
                <Link key={topic.path} to={topic.path} className="no-underline">
                  <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <topic.Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{topic.title}</h3>
                        <p className="text-gray-600 text-sm">{topic.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Help;
