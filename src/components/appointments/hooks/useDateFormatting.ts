
import { format } from "date-fns";

export const useDateFormatting = () => {
  const formatDateTimeForInput = (dateString: string) => {
    return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
  };

  const formatDefaultDate = (date: Date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  return { formatDateTimeForInput, formatDefaultDate };
};
