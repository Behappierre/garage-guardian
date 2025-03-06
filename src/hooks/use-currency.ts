
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$"
};

export type SupportedCurrency = keyof typeof CURRENCY_SYMBOLS;

export const useCurrency = () => {
  const { garageId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["garage-currency", garageId],
    queryFn: async () => {
      if (!garageId) return { currency: "USD" };

      // Get currency from garage settings
      const { data, error } = await supabase
        .from("garages")
        .select("settings")
        .eq("id", garageId)
        .single();

      if (error) throw error;
      
      // Extract currency from garage settings
      const currency = data?.settings?.currency || "USD";
      return { currency };
    },
    enabled: !!garageId,
  });

  const currency = data?.currency as SupportedCurrency || "USD";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  return {
    currency,
    currencySymbol,
    isLoading
  };
};
