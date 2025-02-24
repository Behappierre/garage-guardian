
import { useLocation, Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

const Help = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2];

  const { data: helpContent, isLoading } = useQuery({
    queryKey: ["helpContent", currentSection],
    queryFn: async () => {
      // If we're at the root help page, show the main help content
      if (!currentSection) {
        return {
          title: "Help Center",
          content: `
# Welcome to GarageGuardian Help Center

Choose a topic below to learn more about GarageGuardian's features and capabilities.
`
        };
      }

      try {
        const response = await fetch(`/docs/${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}Help.md`);
        const content = await response.text();
        return {
          title: `${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} Help`,
          content
        };
      } catch (error) {
        console.error('Error loading help content:', error);
        return {
          title: "Error",
          content: "We apologize, but there was an error loading the help content. Please try again later."
        };
      }
    },
  });

  const helpTopics = [
    {
      title: "Appointments",
      description: "Learn how to manage service appointments, scheduling, and bay assignments",
      path: "/dashboard/help/appointments",
      icon: "📅"
    },
    {
      title: "Clients",
      description: "Understand client management, vehicle tracking, and history",
      path: "/dashboard/help/clients",
      icon: "👥"
    },
    {
      title: "Job Tickets",
      description: "Create and manage service tickets, track progress and parts",
      path: "/dashboard/help/job-tickets",
      icon: "🔧"
    },
    {
      title: "Settings",
      description: "Configure your workspace and manage preferences",
      path: "/dashboard/help/settings",
      icon: "⚙️"
    }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-6">
            {!currentSection ? (
              <>
                <div className="prose max-w-none mb-8">
                  <ReactMarkdown>{helpContent?.content || ''}</ReactMarkdown>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpTopics.map((topic) => (
                    <Link key={topic.path} to={topic.path} className="no-underline">
                      <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-start space-x-4">
                          <span className="text-2xl">{topic.icon}</span>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{topic.title}</h3>
                            <p className="text-gray-600 text-sm">{topic.description}</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="prose max-w-none">
                <div className="mb-4">
                  <Link to="/dashboard/help" className="text-primary hover:text-primary/80 no-underline">
                    ← Back to Help Center
                  </Link>
                </div>
                <ReactMarkdown>{helpContent?.content || ''}</ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Help;
