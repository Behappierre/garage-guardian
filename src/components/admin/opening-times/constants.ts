
export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${hour12}:00 ${ampm}`
  };
});

// Helper function to convert database time format (HH:MM:SS) to display format (HH:MM)
export const formatTimeForDisplay = (timeValue: string): string => {
  if (!timeValue) return "";
  return timeValue.substring(0, 5);
};

// Helper function to convert display time format (HH:MM) to database format (HH:MM:SS)
export const formatTimeForDatabase = (timeValue: string): string => {
  if (!timeValue) return "";
  return `${timeValue}:00`;
};
