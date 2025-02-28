
import { useCurrency } from "@/hooks/use-currency";

interface CurrencyDisplayProps {
  amount: number;
  decimals?: number;
  className?: string;
}

export const CurrencyDisplay = ({ 
  amount, 
  decimals = 2,
  className = ""
}: CurrencyDisplayProps) => {
  const { currencySymbol } = useCurrency();
  
  return (
    <span className={className}>
      {currencySymbol}{amount.toFixed(decimals)}
    </span>
  );
};
