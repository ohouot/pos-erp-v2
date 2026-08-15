// Journée commerciale : distincte du jour calendaire, bascule à une heure
// paramétrable par établissement (Establishment.settings.businessDayStartHour).
// Un bar ouvert jusqu'à 3h du matin veut que ses ventes de 1h soient
// rattachées à la journée commerciale de la veille, pas à un "aujourd'hui"
// quasi vide.
export function getBusinessDayStart(date: Date, cutoverHour: number): Date {
  const businessDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  if (date.getHours() < cutoverHour) {
    businessDate.setDate(businessDate.getDate() - 1);
  }
  businessDate.setHours(cutoverHour, 0, 0, 0);
  return businessDate;
}
