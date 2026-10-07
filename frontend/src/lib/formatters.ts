export const formatHoursToHoursMinutes = (decimalHours: number | string | null | undefined): string => {
  if (!decimalHours) return '0h 0m';
  const parsed = Number(decimalHours);
  if (isNaN(parsed)) return '0h 0m';
  
  const hours = Math.floor(parsed);
  const minutes = Math.round((parsed - hours) * 60);
  
  if (minutes === 60) {
    return `${hours + 1}h 0m`;
  }
  
  return `${hours}h ${minutes}m`;
};
