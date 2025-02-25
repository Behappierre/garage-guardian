
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SidebarLogoProps {
  isCollapsed: boolean;
}

export const SidebarLogo = ({ isCollapsed }: SidebarLogoProps) => {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  console.log("Settings data:", settings); // Debug log

  return (
    <div className={cn(
      "flex items-center border-b border-gray-200",
      isCollapsed ? "justify-center p-4" : "px-6 py-4"
    )}>
      {settings?.logo_url ? (
        <img 
          src={settings.logo_url} 
          alt="Garage Logo" 
          className="h-8 w-auto"
        />
      ) : (
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/e33cb773-8a89-43de-82f8-1026ab6337c3.png" 
            alt="Garage Logo" 
            className="h-8 w-8 object-contain"
            onError={(e) => console.error("Error loading garage logo:", e)}
          />
          {!isCollapsed && (
            <img 
              src="/lovable-uploads/3594fe63-3fa2-4b3c-9d23-b9706ebf4fa4.png" 
              alt="GW Text Logo" 
              className="h-8 w-auto"
              onError={(e) => console.error("Error loading text logo:", e)}
            />
          )}
        </div>
      )}
    </div>
  );
};
