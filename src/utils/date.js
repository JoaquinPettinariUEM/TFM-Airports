export const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getDayName(dateString) {
  const date = new Date(dateString);

  return WEEK_DAYS[date.getDay()];
}
