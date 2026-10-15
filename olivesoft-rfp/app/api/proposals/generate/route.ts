import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import pool from "@/lib/db";
import { searchKnowledge } from "@/lib/rag";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const OLIVESOFT_PROFILE = `OliveSoft est une ESN (entreprise de services numériques) présente à Paris, Sfax, Tunis et Dubaï, spécialisée en Data & IA. Nos domaines d'expertise : Intégration de données, Business Intelligence & Dashboarding, Développement IA, Écosystème Salesforce, Data Platform. Nous accompagnons des clients dans le Retail, l'E-commerce, la Mode et le secteur public sur la centralisation, la modernisation et la valorisation de leurs données.`;

const RELEVANCE_THRESHOLD = 0.55;

export async function POST(req: NextRequest) {
  const { tender_id } = await req.json();

  const tenderRes = await pool.query(
    "select title, raw_description, sector, raw_payload from tenders where id = $1",
    [tender_id]
  );
  if (!tenderRes.rows.length) {
    return NextResponse.json({ error: "tender not found" }, { status: 404 });
  }
  const tender = tenderRes.rows[0];
  const requiredRoles: { title: string; count: number }[] = tender.raw_payload?.required_roles ?? [];

  const prospectRes = await pool.query(
    "select id, sector, estimated_revenue, key_partners from prospects where tender_id = $1 order by created_at desc limit 1",
    [tender_id]
  );
  const prospect = prospectRes.rows[0] ?? null;

  const tenderQuery = `${tender.title}\n${tender.raw_description}`;

  let projectMatches, cvMatches;
  try {
    [projectMatches, cvMatches] = await Promise.all([
      searchKnowledge(tenderQuery, 3, "project"),
      searchKnowledge(tenderQuery, 3, "cv"),
    ]);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Échec de la recherche RAG",
        detail: err instanceof Error ? err.message : String(err),
        tender_id,
      },
      { status: 502 }
    );
  }

  const projectsForPrompt = projectMatches
    .map((m, i) => `[${i}] ${m.title} (score: ${m.relevance_score.toFixed(2)}, secteur: ${m.sector}, stack: ${m.tech_stack.join(", ")}) — ${m.description}`)
    .join("\n");

  const teamForPrompt = cvMatches
    .map((m, i) => `[${i}] ${m.title} (score: ${m.relevance_score.toFixed(2)}) — ${m.description}`)
    .join("\n");

  const requiredRolesText = requiredRoles.length
    ? requiredRoles.map((r) => `- ${r.count}x ${r.title}`).join("\n")
    : "Aucun rôle spécifique listé dans le tender.";

  let llmOutput: {
    comprehension: string;
    approche: string;
    architecture: string;
    reference_justifications: string[];
    team_justifications: string[];
    gaps: string;
    conclusion: string;
  };

  try {
    const synthesis = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `Tu es un rédacteur commercial pour OliveSoft (Data, BI, IA — voir profil ci-dessous). Prépare le contenu d'une proposition commerciale HONNÊTE en réponse à ce tender.

Profil OliveSoft : ${OLIVESOFT_PROFILE}

Tender: ${tender.title}
Description: ${tender.raw_description}
Secteur: ${tender.sector}

Rôles explicitement requis par ce tender :
${requiredRolesText}

${
  prospect
    ? `Profil du prospect : secteur ${prospect.sector}, budget estimé ${prospect.estimated_revenue} TND, partenaires : ${JSON.stringify(prospect.key_partners)}`
    : "Aucun profil prospect disponible — ne fais aucune supposition sur le budget ou les partenaires."
}

Projets OliveSoft trouvés par le RAG, indexés [0] à [${projectMatches.length - 1}] :
${projectsForPrompt}

Profils d'équipe trouvés par le RAG, indexés [0] à [${cvMatches.length - 1}] :
${teamForPrompt}

RÈGLES D'HONNÊTETÉ :
- Un score < ${RELEVANCE_THRESHOLD} signifie une correspondance FAIBLE : dans ce cas, écris "expérience transposable sur certains aspects", jamais "directement applicable".
- Compare les rôles requis à l'équipe listée ci-dessus. Si un rôle requis (ex: DevOps Engineer, UX Designer) n'a aucun équivalent, décris-le dans "gaps" (recrutement/sous-traitance nécessaire). Si tout est couvert, renvoie une chaîne vide pour "gaps".
- Ne force aucun lien artificiel entre les compétences réelles d'OliveSoft et des exigences très éloignées.

Réponds avec :
- comprehension : 2-3 phrases reformulant le besoin
- approche : 1-2 paragraphes sur comment OliveSoft répondrait
- architecture : les grandes briques techniques nécessaires pour CE projet
- reference_justifications : un tableau de ${projectMatches.length} chaînes, une par projet indexé ci-dessus DANS LE MÊME ORDRE, chacune expliquant en 2-3 phrases le lien avec ce tender
- team_justifications : un tableau de ${cvMatches.length} chaînes, une par profil indexé ci-dessus DANS LE MÊME ORDRE, chacune expliquant en 1-2 phrases sa contribution
- gaps : description des rôles requis non couverts (chaîne vide si aucun)
- conclusion : honnête sur le niveau réel d'adéquation`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            comprehension: { type: "string" },
            approche: { type: "string" },
            architecture: { type: "string" },
            reference_justifications: { type: "array", items: { type: "string" } },
            team_justifications: { type: "array", items: { type: "string" } },
            gaps: { type: "string" },
            conclusion: { type: "string" },
          },
          required: ["comprehension", "approche", "architecture", "reference_justifications", "team_justifications", "gaps", "conclusion"],
        },
      },
    });

    llmOutput = JSON.parse(synthesis.text!);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Échec de la génération LLM",
        detail: err instanceof Error ? err.message : String(err),
        tender_id,
      },
      { status: 502 }
    );
  }

  // On construit nous-mêmes les titres/scores des références — jamais reparsés depuis du texte libre.
  const referenceItems = projectMatches.map((m, i) => ({
    heading: `${m.title} (score de pertinence : ${m.relevance_score.toFixed(2)})`,
    text: llmOutput.reference_justifications[i] ?? m.description,
  }));

  const teamItems = cvMatches.map((m, i) => ({
    heading: `${m.title} (score de pertinence : ${m.relevance_score.toFixed(2)})`,
    text: llmOutput.team_justifications[i] ?? m.description,
  }));

  const structuredProposal = {
    sections: [
      { number: 1, title: "Présentation d'OliveSoft", body: OLIVESOFT_PROFILE },
      { number: 2, title: "Compréhension du besoin", body: llmOutput.comprehension },
      { number: 3, title: "Approche proposée", body: llmOutput.approche },
      { number: 4, title: "Architecture proposée", body: llmOutput.architecture },
      { number: 5, title: "Références similaires", items: referenceItems },
      {
        number: 6,
        title: "Équipe proposée",
        items: llmOutput.gaps ? [...teamItems, { heading: "Écarts identifiés", text: llmOutput.gaps }] : teamItems,
      },
      { number: 7, title: "Conclusion", body: llmOutput.conclusion },
    ],
  };

  const content = JSON.stringify(structuredProposal);

  const inserted = await pool.query(
    `insert into proposals (tender_id, prospect_id, content, status)
     values ($1, $2, $3, 'draft')
     returning *`,
    [tender_id, prospect?.id ?? null, content]
  );

  await pool.query(
    "update tenders set status = 'proposal_ready', updated_at = now() where id = $1",
    [tender_id]
  );

  return NextResponse.json(inserted.rows[0]);
}