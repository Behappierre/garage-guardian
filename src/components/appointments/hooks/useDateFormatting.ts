
export const useDateFormatting = () => {
  const formatDateTimeForInput = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
  };

  const formatDefaultDate = (date: Date) => {
    // Round to nearest hour for better UX
    const rounded = new Date(date);
    rounded.setMinutes(0);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    rounded.setHours(rounded.getHours() + 1);
    return formatDateTimeForInput(rounded);
  };

  return {
    formatDateTimeForInput,
    formatDefaultDate
  };
};
