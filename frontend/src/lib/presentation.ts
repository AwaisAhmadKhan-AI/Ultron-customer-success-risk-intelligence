export function labelize(value: string | null | undefined): string {
  if (!value) return "Not available";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function daysUntil(value: string | null): number | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  const renewal = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  renewal.setHours(0, 0, 0, 0);

  return Math.ceil(
    (renewal.getTime() - today.getTime()) / 86_400_000,
  );
}

export function riskClass(value: string | null | undefined): string {
  switch (value) {
    case "critical":
      return "bg-red-100 text-red-800 ring-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "medium":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "low":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export function statusClass(value: string | null | undefined): string {
  switch (value) {
    case "active":
    case "completed":
    case "ready":
      return "bg-emerald-50 text-emerald-700";
    case "at_risk":
    case "renewal_pending":
    case "processing":
    case "in_progress":
      return "bg-amber-50 text-amber-800";
    case "churned":
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
