
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { LucideIcon, HelpCircle, Calendar, Users, Wrench, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface HelpTopic {
  title: string;
  description: string;
  id: string;
  Icon: LucideIcon;
}

const helpTopics: HelpTopic[] = [
  {
    title: "Getting Started",
    description: "Learn the basics of using GarageGuardian",
    id: "getting-started",
    Icon: HelpCircle
  },
  {
    title: "Appointments",
    description: "Schedule and manage service appointments",
    id: "appointments",
    Icon: Calendar
  },
  {
    title: "Client Management",
    description: "Track clients and their vehicles",
    id: "clients",
    Icon: Users
  },
  {
    title: "Job Tickets",
    description: "Create and manage service tickets",
    id: "job-tickets",
    Icon: Wrench
  },
  {
    title: "Settings & Configuration",
    description: "Customize your workspace preferences",
    id: "settings",
    Icon: Settings
  }
];

const Help = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data: helpContent } = useQuery({
    queryKey: ["helpContent", selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return null;
      const response = await fetch(`/docs/${selectedTopic.charAt(0).toUpperCase() + selectedTopic.slice(1)}Help.md`);
      return await response.text();
    },
    enabled: !!selectedTopic
  });

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

            <Tabs value={selectedTopic || "topics"} onValueChange={(value) => setSelectedTopic(value === "topics" ? null : value)}>
              <TabsList className="w-full border-b mb-4">
                <TabsTrigger value="topics">Topics</TabsTrigger>
                {selectedTopic && (
                  <TabsTrigger value={selectedTopic}>
                    {helpTopics.find(topic => topic.id === selectedTopic)?.title}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="topics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpTopics.map((topic) => (
                    <Card 
                      key={topic.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTopic(topic.id)}
                    >
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
                  ))}
                </div>
              </TabsContent>

              {selectedTopic && (
                <TabsContent value={selectedTopic} className="prose max-w-none">
                  {helpContent && <ReactMarkdown>{helpContent}</ReactMarkdown>}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Help;
