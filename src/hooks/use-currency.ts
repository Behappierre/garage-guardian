
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$"
};

export type SupportedCurrency = keyof typeof CURRENCY_SYMBOLS;

export const useCurrency = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("currency")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const currency = data?.currency as SupportedCurrency || "USD";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "$";

  return {
    currency,
    currencySymbol,
    isLoading
  };
};
