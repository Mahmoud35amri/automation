import type { AssetType, TenderStatus } from "./backend";

const TZ = "Africa/Tunis";

// Le backend renvoie des dates naïves (sans fuseau) : on les lit comme UTC pour garder l'heure saisie telle quelle.
function parse(value: string): Date {
  return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
}

export function formatDate(value: string | null, withYear = true): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: withYear ? "long" : "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(parse(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(parse(value));
}

export function today(): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ })
    .format(new Date());
}

// Jours calendaires entre aujourd'hui (heure de Tunis) et la date limite.
export function daysUntil(deadline: string): number {
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  return Math.round((Date.parse(deadline.slice(0, 10)) - Date.parse(now)) / 86_400_000);
}

// Seulement les vrais liens web (le scraper démo écrit demo://…, le NLP une référence).
export function webUrl(url: string | null): URL | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

export function hostname(url: string | null): string | null {
  return webUrl(url)?.hostname.replace(/^www\./, "") ?? null;
}

export function formatAmount(value: number, currency: string | null): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)}${currency ? ` ${currency}` : ""}`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

// --- Statuts : la machine à états du backend (app/models/tender.py) ---

export const STAGES: TenderStatus[] = ["DETECTED", "RESEARCHING", "RESEARCHED", "GENERATING_PROPOSAL", "PROPOSAL_READY"];

export const IN_PROGRESS: TenderStatus[] = ["RESEARCHING", "GENERATING_PROPOSAL"];

// Classes complètes (Tailwind ne détecte pas les noms construits dynamiquement).
export const STATUS: Record<TenderStatus, { label: string; stage: string; dot: string; badge: string }> = {
  DETECTED: { label: "Détecté", stage: "Détectés", dot: "bg-slate", badge: "text-slate border-slate/30 bg-slate/5" },
  RESEARCHING: { label: "Recherche en cours", stage: "Recherche", dot: "bg-amber animate-pulse", badge: "text-amber-deep border-amber/40 bg-amber/10" },
  RESEARCHED: { label: "Prospect qualifié", stage: "Qualifiés", dot: "bg-teal", badge: "text-teal border-teal/30 bg-teal/5" },
  GENERATING_PROPOSAL: { label: "Rédaction en cours", stage: "Rédaction", dot: "bg-amber animate-pulse", badge: "text-amber-deep border-amber/40 bg-amber/10" },
  PROPOSAL_READY: { label: "Proposition prête", stage: "Prêtes", dot: "bg-olive", badge: "text-olive border-olive/30 bg-olive/5" },
  FAILED: { label: "Échec", stage: "Échecs", dot: "bg-brick", badge: "text-brick border-brick/30 bg-brick/5" },
};

export const ASSET_TYPE: Record<AssetType, string> = {
  CV: "Profil",
  PAST_PROJECT: "Projet",
  TOOL_STACK: "Outil",
};
