
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Moon, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [uploading, setUploading] = useState(false);

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
        description: `Theme changed to dark mode`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicURL } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      // Update settings with new logo URL
      const { error: updateError } = await supabase
        .from("settings")
        .update({ logo_url: publicURL.publicUrl })
        .eq("id", settings.id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ["settings"] });

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <PageHeader
        title="Settings"
      />
      
      <div className="px-8 pb-8 space-y-6">
        <div className="flex items-center justify-between p-6 border rounded-lg bg-card">
          <div className="space-y-0.5">
            <h2 className="text-lg font-medium">Dark Mode</h2>
            <p className="text-sm text-muted-foreground">
              Toggle between light and dark theme
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Sun className="h-5 w-5 text-muted-foreground" />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={handleThemeChange}
              className="data-[state=checked]:bg-rose-500"
            />
            <Moon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border rounded-lg bg-card">
          <div className="space-y-0.5">
            <h2 className="text-lg font-medium">Garage Logo</h2>
            <p className="text-sm text-muted-foreground">
              Upload your garage logo (recommended size: 200x50px)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Garage logo"
                className="h-12 object-contain"
              />
            )}
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={uploading}
              onClick={() => document.getElementById("logo-upload")?.click()}
            >
              <Upload className="h-4 w-4" />
              <span>{uploading ? "Uploading..." : "Upload Logo"}</span>
            </Button>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
