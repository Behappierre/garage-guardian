
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { ThemeSettings, CurrencySettings, LogoSettings } from "@/components/settings";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (settings?.dark_mode) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, [settings?.dark_mode, setTheme]);

  const isDarkMode = theme === "dark";

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="Settings"
        className={isDarkMode ? "bg-black" : ""}
      />
      
      <div className="px-8 pb-8 space-y-6">
        <ThemeSettings />
        <CurrencySettings />
        <LogoSettings />
      </div>
    </div>
  );
}
