
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { ThemeSettings, CurrencySettings, LogoSettings } from "@/components/settings";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { garageId } = useAuth();

  const { data: garageSettings } = useQuery({
    queryKey: ["garage-settings", garageId],
    queryFn: async () => {
      if (!garageId) return null;
      
      const { data, error } = await supabase
        .from("garages")
        .select("settings")
        .eq("id", garageId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!garageId
  });

  useEffect(() => {
    if (garageSettings?.settings?.dark_mode) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, [garageSettings?.settings?.dark_mode, setTheme]);

  return (
    <div className="flex flex-col w-full h-full bg-background">
      <PageHeader title="Settings" />
      
      <div className="px-8 pb-8 space-y-6">
        <ThemeSettings />
        <CurrencySettings />
        <LogoSettings />
      </div>
    </div>
  );
}
