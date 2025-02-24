
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

const Help = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'dashboard';

  const { data: helpContent, isLoading } = useQuery({
    queryKey: ["helpContent", currentSection],
    queryFn: async () => {
      const defaultContent = `# ${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} Help

This section provides help and guidance for the ${currentSection} feature. Detailed documentation for this section is coming soon.

## Quick Tips
- Use the navigation menu on the left to switch between different sections
- Click on items to view more details
- Use the search function to find specific information
- Contact support if you need additional assistance`;

      try {
        const response = await fetch(`/src/docs/${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}Help.md`);
        if (!response.ok) {
          return defaultContent;
        }
        return await response.text();
      } catch (error) {
        console.error('Error loading help content:', error);
        return defaultContent;
      }
    },
  });

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
          <div className="p-6 prose prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-headings:font-semibold prose-headings:mb-4 prose-p:text-gray-600 prose-a:text-primary hover:prose-a:text-primary/80 prose-ul:list-disc">
            <ReactMarkdown>{helpContent || ''}</ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Help;
