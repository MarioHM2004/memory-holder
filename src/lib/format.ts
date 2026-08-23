export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`)
    .toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}
