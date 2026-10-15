interface TenderRequirement {
  text: string;
  mandatory?: boolean;
}

interface TenderRole {
  count: number;
  title: string;
  min_experience_years?: number;
}

interface TenderPayload {
  title?: string;
  project_type?: string[];
  client_name?: string;
  requirements?: TenderRequirement[];
  required_roles?: TenderRole[];
  required_technologies?: string[];
}

export function buildTitle(payload: TenderPayload): string {
  if (payload.title && payload.title.length > 15 && payload.title.toUpperCase() !== "REQUEST FOR PROPOSAL") {
    return payload.title;
  }
  const projectTypes = (payload.project_type ?? []).map((t: string) => t.replace(/_/g, " ")).join(", ");
  const client = payload.client_name ?? "un organisme non identifié";
  return projectTypes ? `${projectTypes} — ${client}` : `Appel d'offres — ${client}`;
}

export function buildDescription(payload: TenderPayload): string {
  const reqs = (payload.requirements ?? [])
    .map((r: TenderRequirement) => `- ${r.text}${r.mandatory ? " (obligatoire)" : " (optionnel)"}`)
    .join("\n");
  const roles = (payload.required_roles ?? [])
    .map((r: TenderRole) => `${r.count}x ${r.title}${r.min_experience_years ? ` (${r.min_experience_years} ans min.)` : ""}`)
    .join(", ");
  const tech = (payload.required_technologies ?? []).join(", ");

  return [
    payload.client_name ? `Client : ${payload.client_name}` : null,
    tech ? `Technologies requises : ${tech}` : null,
    roles ? `Rôles requis : ${roles}` : null,
    reqs ? `Exigences :\n${reqs}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}