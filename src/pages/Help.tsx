
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";

const Help = () => {
  const location = useLocation();
  const currentSection = location.pathname.split('/')[2] || 'appointments';

  const { data: helpContent } = useQuery({
    queryKey: ["helpContent", currentSection],
    queryFn: async () => {
      try {
        const response = await fetch(`/src/docs/${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}Help.md`);
        const content = await response.text();
        return content;
      } catch (error) {
        return "# Help Content Not Found\n\nThe help content for this section is not available yet.";
      }
    },
  });

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow">
        <ScrollArea className="h-[calc(100vh-12rem)] p-6">
          <article className="prose max-w-none">
            <ReactMarkdown>{helpContent || ''}</ReactMarkdown>
          </article>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Help;
