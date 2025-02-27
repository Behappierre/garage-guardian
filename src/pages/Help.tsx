
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { LucideIcon, HelpCircle, Calendar, Users, Wrench, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";

interface HelpTopic {
  title: string;
  description: string;
  id: string;
  Icon: LucideIcon;
}

const helpTopics: HelpTopic[] = [
  {
    title: "Getting Started",
    description: "Learn the basics of using GarageWizz",
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
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const { data: helpContent } = useQuery({
    queryKey: ["helpContent", selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return null;
      // Convert kebab-case to PascalCase for file naming
      const formattedTopic = selectedTopic
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
      const response = await fetch(`/docs/${formattedTopic}Help.md`);
      if (!response.ok) {
        console.error(`Failed to load help content for ${selectedTopic}`);
        return null;
      }
      return await response.text();
    },
    enabled: !!selectedTopic
  });

  return (
    <div className={`container mx-auto py-6 max-w-4xl ${isDarkMode ? "bg-black" : ""}`}>
      <div className={`${isDarkMode ? "bg-gray-900" : "bg-white"} rounded-lg shadow`}>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-6">
            <div className="prose max-w-none mb-8">
              <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Help Center</h1>
              <p className={`mb-8 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Welcome to GarageWizz Help Center. Choose a topic below to learn more about our features and capabilities.
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
                      className={`p-4 transition-colors cursor-pointer ${
                        isDarkMode 
                          ? "bg-gray-800 hover:bg-gray-700" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedTopic(topic.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <topic.Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className={`font-semibold text-lg mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {topic.title}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {topic.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {selectedTopic && (
                <TabsContent value={selectedTopic}>
                  <div className="markdown-content text-left">
                    <div className="space-y-6">
                      {helpContent && (
                        <ReactMarkdown
                          components={{
                            h1: ({children}) => <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{children}</h1>,
                            h2: ({children}) => <h2 className={`text-2xl font-semibold mt-8 mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{children}</h2>,
                            h3: ({children}) => <h3 className={`text-xl font-medium mt-6 mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{children}</h3>,
                            p: ({children}) => <p className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{children}</p>,
                            ul: ({children}) => <ul className="space-y-2 mb-4 ml-4">{children}</ul>,
                            li: ({children}) => <li className={`flex items-start ${isDarkMode ? "text-gray-300" : ""}`}><span className="mr-2">•</span> <span>{children}</span></li>,
                            strong: ({children}) => <strong className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{children}</strong>,
                            hr: () => <hr className={`my-8 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`} />,
                            em: ({children}) => <em className={`italic ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{children}</em>,
                          }}
                        >
                          {helpContent}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
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
