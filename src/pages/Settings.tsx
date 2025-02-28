
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Moon, Sun, Upload, DollarSign, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

  const handleCurrencyChange = async (currency: string) => {
    try {
      const { error } = await supabase
        .from("settings")
        .update({ currency })
        .eq("id", settings.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["settings"] });

      toast({
        title: "Success",
        description: `Currency changed to ${currency === 'USD' ? 'US Dollar' : 'Euro'}`,
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

  const isDarkMode = theme === "dark";
  const currentCurrency = settings?.currency || 'USD';

  return (
    <div className={`flex flex-col w-full h-full ${isDarkMode ? "bg-black" : "bg-background"}`}>
      <PageHeader
        title="Settings"
        className={isDarkMode ? "bg-black" : ""}
      />
      
      <div className="px-8 pb-8 space-y-6">
        <div className={`flex flex-col p-6 border rounded-lg ${
          isDarkMode 
            ? "border-gray-800 bg-black" 
            : "border-gray-200 bg-card"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-medium ${isDarkMode ? "text-white" : "text-foreground"}`}>
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
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
            Toggle between light and dark theme
          </p>
        </div>

        <div className={`flex flex-col p-6 border rounded-lg ${
          isDarkMode 
            ? "border-gray-800 bg-black" 
            : "border-gray-200 bg-card"
        }`}>
          <div className="mb-4">
            <h2 className={`text-lg font-medium mb-4 ${isDarkMode ? "text-white" : "text-foreground"}`}>
              Currency
            </h2>
            <RadioGroup 
              value={currentCurrency} 
              onValueChange={handleCurrencyChange}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="USD" id="usd" />
                <Label htmlFor="usd" className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>US Dollar (USD)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="EUR" id="eur" />
                <Label htmlFor="eur" className="flex items-center">
                  <Euro className="h-4 w-4 mr-2" />
                  <span>Euro (EUR)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
            Set the currency used throughout the application
          </p>
        </div>

        <div className={`flex flex-col p-6 border rounded-lg ${
          isDarkMode 
            ? "border-gray-800 bg-black" 
            : "border-gray-200 bg-card"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-medium ${isDarkMode ? "text-white" : "text-foreground"}`}>
              Garage Logo
            </h2>
            <div className="flex items-center space-x-4">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
                  alt="Garage logo"
                  className="h-12 object-contain"
                />
              )}
              <Button
                variant={isDarkMode ? "default" : "outline"}
                className={`flex items-center gap-2 ${
                  isDarkMode 
                    ? "bg-gray-100 hover:bg-gray-200 text-black" 
                    : ""
                }`}
                disabled={uploading}
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="h-4 w-4" />
                <span>Upload Logo</span>
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
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
            Upload your garage logo (recommended size: 200x50px)
          </p>
        </div>
      </div>
    </div>
  );
}
