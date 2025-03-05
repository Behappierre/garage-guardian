
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ThemeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const handleThemeChange = async () => {
    const newDarkMode = theme === "light";
    try {
      const { error } = await supabase
        .from("settings")
        .update({ dark_mode: newDarkMode })
        .eq("id", settings.id);

      if (error) throw error;

      setTheme(newDarkMode ? "dark" : "light");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });

      toast({
        title: "Success",
        description: `Theme changed to ${newDarkMode ? "dark" : "light"} mode`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const isDarkMode = theme === "dark";

  return (
    <div className="flex flex-col p-6 border rounded-lg border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground">
          Dark Mode
        </h2>
        <div className="flex items-center space-x-2">
          <Sun className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-amber-500"}`} />
          <Switch
            checked={isDarkMode}
            onCheckedChange={handleThemeChange}
            className="data-[state=checked]:bg-rose-500"
          />
          <Moon className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Toggle between light and dark theme
      </p>
    </div>
  );
}
