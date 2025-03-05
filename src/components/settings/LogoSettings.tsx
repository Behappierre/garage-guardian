
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTheme } from "next-themes";

export function LogoSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const { garageId } = useAuth();

  const { data: garageData } = useQuery({
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
    enabled: !!garageId
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!garageId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No garage selected. Please select a garage first.",
        });
        return;
      }

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

      // Update garage with new logo URL
      const { error: updateError } = await supabase
        .from("garages")
        .update({ logo_url: publicURL.publicUrl })
        .eq("id", garageId);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ["garage", garageId] });
      await queryClient.invalidateQueries({ queryKey: ["garages"] });

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

  return (
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
          {garageData?.logo_url && (
            <img
              src={garageData.logo_url}
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
            disabled={uploading || !garageId}
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
      {!garageId && (
        <p className="mt-2 text-amber-500 text-sm">
          You need to select a garage before uploading a logo
        </p>
      )}
    </div>
  );
}
