
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

  return (
    <div className={cn(
      "flex items-center gap-2 border-b border-gray-200",
      isCollapsed ? "justify-center p-4" : "px-6 py-4"
    )}>
      {settings?.logo_url ? (
        <img 
          src={settings.logo_url} 
          alt="Garage Logo" 
          className="h-8 w-auto"
        />
      ) : (
        <img 
          src="/lovable-uploads/ba509b59-4243-41c9-9fe3-392cd0b2b2a7.png" 
          alt="Garage Whizz Logo" 
          className="h-8 w-auto"
        />
      )}
      {!isCollapsed && <span className="font-semibold text-xl">Whizz</span>}
    </div>
  );
};
