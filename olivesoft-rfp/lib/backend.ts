import { buildDescription, buildTitle } from "./ingestTender";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000/api/v1";

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function backend<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new BackendError(res.status, `${method} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

type BackendTender = {
  id: number;
  title: string;
  raw_description: string;
  nlp_metadata: (Parameters<typeof buildTitle>[0] & { client_sector?: string }) | null;
  research: { id: number; sector: string | null; estimated_revenue: string | null; key_partners: string[] } | null;
};

// Le backend garde l'extraction NLP brute dans nlp_metadata (raw_description est vide pour /tenders/from-nlp) :
// titre, description, secteur et rôles en sont reconstruits avec les mêmes règles que l'ancien /api/tenders/ingest.
export async function getTender(id: string | number) {
  let tender: BackendTender;
  try {
    tender = await backend<BackendTender>(`/tenders/${id}`);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
  const meta = tender.nlp_metadata ?? {};
  return {
    ...tender,
    title: tender.nlp_metadata ? buildTitle(meta) : tender.title,
    raw_description: tender.raw_description || buildDescription(meta),
    sector: meta.client_sector ?? null,
    required_roles: meta.required_roles ?? [],
  };
}
