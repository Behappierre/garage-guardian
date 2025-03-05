
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Euro, PoundSterling, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";

export function CurrencySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

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

  const handleCurrencyChange = async (currency: string) => {
    try {
      const { error } = await supabase
        .from("settings")
        .update({ currency })
        .eq("id", settings.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["settings"] });

      const currencyNames = {
        USD: 'US Dollar',
        EUR: 'Euro',
        GBP: 'British Pound',
        CAD: 'Canadian Dollar'
      };

      toast({
        title: "Success",
        description: `Currency changed to ${currencyNames[currency as keyof typeof currencyNames]}`,
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
  const currentCurrency = settings?.currency || 'USD';

  return (
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
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="GBP" id="gbp" />
            <Label htmlFor="gbp" className="flex items-center">
              <PoundSterling className="h-4 w-4 mr-2" />
              <span>British Pound (GBP)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="CAD" id="cad" />
            <Label htmlFor="cad" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span>Canadian Dollar (CAD)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>
      <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
        Set the currency used throughout the application
      </p>
    </div>
  );
}
