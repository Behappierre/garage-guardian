
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";

interface SidebarLogoProps {
  isCollapsed: boolean;
}

export const SidebarLogo = ({ isCollapsed }: SidebarLogoProps) => {
  const { garageId } = useAuth();

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

  const { data: garage } = useQuery({
    queryKey: ["garage", garageId],
    queryFn: async () => {
      if (!garageId) return null;
      
      const { data, error } = await supabase
        .from("garages")
        .select("*")
        .eq("id", garageId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!garageId,
  });

  return (
    <div className={cn(
      "flex items-center border-b border-gray-200",
      isCollapsed ? "justify-center p-4" : "px-6 py-4"
    )}>
      {garage?.logo_url ? (
        <img 
          src={garage.logo_url} 
          alt="Garage Logo" 
          className="h-8 w-auto object-contain"
          onError={(e) => console.error("Error loading garage logo:", e)}
        />
      ) : settings?.logo_url ? (
        <img 
          src={settings.logo_url} 
          alt="Garage Logo" 
          className="h-8 w-auto object-contain"
          onError={(e) => console.error("Error loading settings logo:", e)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="flex items-center justify-start w-8">
            <img 
              src="/lovable-uploads/e33cb773-8a89-43de-82f8-1026ab6337c3.png" 
              alt="Garage Logo" 
              className="h-8 w-8 object-contain flex-shrink-0"
              onError={(e) => console.error("Error loading garage logo:", e)}
            />
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-start overflow-hidden">
              <img 
                src="/lovable-uploads/3594fe63-3fa2-4b3c-9d23-b9706ebf4fa4.png" 
                alt="GW Text Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => console.error("Error loading text logo:", e)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
